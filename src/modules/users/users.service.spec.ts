import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import { Pais } from '../../database/entities/pais.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { ActivationService } from '../auth/activation.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;
  let paisRepository: jest.Mocked<Repository<Pais>>;
  let activationService: jest.Mocked<Pick<ActivationService, 'createActivationToken'>>;
  let mailService: jest.Mocked<
    Pick<MailService, 'sendActivationEmail' | 'sendPasswordResetEmail'>
  >;

  const mockUsuario: Usuario = {
    id: 1,
    nombre: 'Admin Test',
    correo: 'admin@test.com',
    passwordHash: null,
    rol: Rol.ADMINISTRADOR,
    paisId: null,
    pais: null,
    estado: EstadoUsuario.INACTIVO,
    intentosFallidos: 0,
    fechaCreacion: new Date(),
    eliminado: false,
    fechaEliminacion: null,
    eliminadoPorId: null,
    eliminadoPor: null,
    sesiones: [],
    tokensActivacion: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pais),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ActivationService,
          useValue: {
            createActivationToken: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendActivationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            shouldExposeDevTokens: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    usuarioRepository = module.get(getRepositoryToken(Usuario));
    paisRepository = module.get(getRepositoryToken(Pais));
    activationService = module.get(ActivationService);
    mailService = module.get(MailService);
  });

  describe('findById', () => {
    it('should query usuario with eliminado=false filter', async () => {
      usuarioRepository.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findById(1);

      expect(usuarioRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, eliminado: false },
      });
      expect(result).toBe(mockUsuario);
    });

    it('should return null when usuario not found', async () => {
      usuarioRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByCorreo', () => {
    it('should query usuario by correo with eliminado=false filter', async () => {
      usuarioRepository.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findByCorreo('admin@test.com');

      expect(usuarioRepository.findOne).toHaveBeenCalledWith({
        where: { correo: 'admin@test.com', eliminado: false },
      });
      expect(result).toBe(mockUsuario);
    });
  });

  describe('existsByCorreo', () => {
    it('should return true when usuario exists', async () => {
      usuarioRepository.count.mockResolvedValue(1);

      const result = await service.existsByCorreo('admin@test.com');

      expect(usuarioRepository.count).toHaveBeenCalledWith({
        where: { correo: 'admin@test.com', eliminado: false },
      });
      expect(result).toBe(true);
    });

    it('should return false when usuario does not exist', async () => {
      usuarioRepository.count.mockResolvedValue(0);

      const result = await service.existsByCorreo('nuevo@test.com');

      expect(result).toBe(false);
    });
  });

  describe('findAllPaisesActivos', () => {
    it('should return active countries ordered by nombre', async () => {
      const paises: Pais[] = [
        { id: 1, nombre: 'Colombia', activo: true, usuarios: [], sesiones: [] },
        { id: 2, nombre: 'Perú', activo: true, usuarios: [], sesiones: [] },
      ];
      paisRepository.find.mockResolvedValue(paises);

      const result = await service.findAllPaisesActivos();

      expect(paisRepository.find).toHaveBeenCalledWith({
        where: { activo: true },
        order: { nombre: 'ASC' },
      });
      expect(result).toEqual(paises);
    });
  });

  describe('createUser', () => {
    it('should create inactive user and send activation email', async () => {
      usuarioRepository.count.mockResolvedValue(0);
      paisRepository.findOne.mockResolvedValue({ id: 1, activo: true } as Pais);
      usuarioRepository.create.mockReturnValue(mockUsuario);
      usuarioRepository.save.mockResolvedValue(mockUsuario);
      activationService.createActivationToken.mockResolvedValue('raw-token-hex');

      const result = await service.createUser({
        nombre: 'Nuevo',
        correo: 'nuevo@test.com',
        rol: Rol.VISITANTE,
        paisId: 1,
      });

      expect(result.usuario.correo).toBe('admin@test.com');
      expect(activationService.createActivationToken).toHaveBeenCalledWith(1);
      expect(mailService.sendActivationEmail).toHaveBeenCalledWith(
        'admin@test.com',
        'Admin Test',
        'raw-token-hex',
      );
    });

    it('should reject duplicate correo', async () => {
      usuarioRepository.count.mockResolvedValue(1);

      await expect(
        service.createUser({
          nombre: 'Dup',
          correo: 'dup@test.com',
          rol: Rol.VISITANTE,
          paisId: 1,
        }),
      ).rejects.toMatchObject({
        response: { errorCode: 'CORREO_YA_REGISTRADO' },
      });
    });
  });

  describe('unlockUser', () => {
    it('should resend activation for blocked user', async () => {
      usuarioRepository.findOne.mockResolvedValue({
        ...mockUsuario,
        estado: EstadoUsuario.BLOQUEADA,
        intentosFallidos: 5,
      });
      usuarioRepository.save.mockImplementation(async (u) => u as Usuario);
      activationService.createActivationToken.mockResolvedValue('new-token');
      mailService.sendActivationEmail.mockResolvedValue(undefined);

      const result = await service.unlockUser(1, 99);

      expect(result.message).toContain('activación');
      expect(usuarioRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoUsuario.INACTIVO,
          intentosFallidos: 0,
        }),
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send reset email for active user', async () => {
      usuarioRepository.findOne.mockResolvedValue({
        ...mockUsuario,
        estado: EstadoUsuario.ACTIVO,
      });
      activationService.createActivationToken.mockResolvedValue('reset-token');

      await service.requestPasswordReset(1);

      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'admin@test.com',
        'Admin Test',
        'reset-token',
      );
    });
  });
});
