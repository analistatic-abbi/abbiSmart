import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import { TokenActivacion } from '../../database/entities/token-activacion.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { ActivationService } from './activation.service';
import { AuditService } from '../audit/audit.service';
import { SesionService } from './sesion.service';

describe('ActivationService', () => {
  let service: ActivationService;
  let tokenRepository: jest.Mocked<Repository<TokenActivacion>>;
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;

  const mockUsuario: Usuario = {
    id: 1,
    nombre: 'Test User',
    correo: 'test@example.com',
    passwordHash: null,
    rol: Rol.VISITANTE,
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
        ActivationService,
        {
          provide: getRepositoryToken(TokenActivacion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'security.activationTokenExpiresHours') return 48;
              if (key === 'security.bcryptRounds') return 4;
              return undefined;
            }),
          },
        },
        {
          provide: SesionService,
          useValue: {
            invalidateAllUserSessions: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ActivationService);
    tokenRepository = module.get(getRepositoryToken(TokenActivacion));
    usuarioRepository = module.get(getRepositoryToken(Usuario));
  });

  describe('createActivationToken', () => {
    it('should persist hashed token and return raw token', async () => {
      tokenRepository.create.mockImplementation((data) => data as TokenActivacion);
      tokenRepository.save.mockImplementation(async (entity) => entity as TokenActivacion);

      const rawToken = await service.createActivationToken(1);

      expect(rawToken).toHaveLength(64);
      expect(tokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: 1,
          token: service.hashToken(rawToken),
          usado: false,
        }),
      );
      expect(tokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('activateAccount', () => {
    it('should reject invalid token', async () => {
      tokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.activateAccount('invalid-token', 'Password1'),
      ).rejects.toMatchObject({
        response: { errorCode: 'TOKEN_ACTIVACION_INVALIDO' },
      });
    });

    it('should activate usuario with valid token', async () => {
      const rawToken = 'a'.repeat(64);
      const tokenEntity: TokenActivacion = {
        id: 1,
        usuarioId: 1,
        usuario: mockUsuario,
        token: service.hashToken(rawToken),
        fechaCreacion: new Date(),
        fechaExpiracion: new Date(Date.now() + 3600000),
        usado: false,
      };

      tokenRepository.findOne.mockResolvedValue(tokenEntity);
      usuarioRepository.findOne.mockResolvedValue({ ...mockUsuario });
      usuarioRepository.save.mockImplementation(async (u) => u as Usuario);
      tokenRepository.save.mockImplementation(async (t) => t as TokenActivacion);

      const result = await service.activateAccount(rawToken, 'Password1');

      expect(result.estado).toBe(EstadoUsuario.ACTIVO);
      expect(usuarioRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: EstadoUsuario.ACTIVO,
          passwordHash: expect.any(String),
        }),
      );
      expect(tokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ usado: true }),
      );
    });
  });
});
