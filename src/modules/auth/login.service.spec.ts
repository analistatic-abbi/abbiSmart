import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { EstadoUsuario } from '../../common/enums/estado-usuario.enum';
import { Rol } from '../../common/enums/rol.enum';
import { Pais } from '../../database/entities/pais.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { LoginService } from './login.service';
import { AuditService } from '../audit/audit.service';
import { PreAuthService } from './pre-auth.service';
import { SesionService } from './sesion.service';

describe('LoginService', () => {
  let service: LoginService;
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;
  let paisRepository: jest.Mocked<Repository<Pais>>;
  let preAuthService: jest.Mocked<Pick<PreAuthService, 'createToken' | 'revokeToken'>>;
  let sesionService: jest.Mocked<Pick<SesionService, 'createSession'>>;

  const activeUser: Usuario = {
    id: 1,
    nombre: 'Test',
    correo: 'test@example.com',
    passwordHash: '',
    rol: Rol.VISITANTE,
    paisId: null,
    pais: null,
    estado: EstadoUsuario.ACTIVO,
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
    activeUser.passwordHash = await bcrypt.hash('Password1', 4);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pais),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: PreAuthService,
          useValue: {
            createToken: jest.fn(),
            revokeToken: jest.fn(),
          },
        },
        {
          provide: SesionService,
          useValue: {
            createSession: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'security.maxLoginAttempts') return 5;
              return undefined;
            }),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(LoginService);
    usuarioRepository = module.get(getRepositoryToken(Usuario));
    paisRepository = module.get(getRepositoryToken(Pais));
    preAuthService = module.get(PreAuthService);
    sesionService = module.get(SesionService);
  });

  it('should return preAuthToken for non-operador roles', async () => {
    usuarioRepository.findOne.mockResolvedValue({ ...activeUser });
    usuarioRepository.save.mockResolvedValue({ ...activeUser });
    paisRepository.find.mockResolvedValue([
      { id: 1, nombre: 'Colombia', activo: true, usuarios: [], sesiones: [] },
    ]);
    preAuthService.createToken.mockReturnValue('pre-auth-token');

    const result = await service.login('test@example.com', 'Password1');

    expect(result.requiresCountrySelection).toBe(true);
    if (result.requiresCountrySelection) {
      expect(result.preAuthToken).toBe('pre-auth-token');
      expect(result.paises).toHaveLength(1);
    }
  });

  it('should create session automatically for operador', async () => {
    const operador = {
      ...activeUser,
      rol: Rol.OPERADOR,
      paisId: 1,
    };
    usuarioRepository.findOne.mockResolvedValue(operador);
    usuarioRepository.save.mockResolvedValue(operador);
    sesionService.createSession.mockResolvedValue({
      id: 10,
      paisSesionId: 1,
      refreshToken: 'refresh-token',
      fechaExpiracion: new Date(),
    });

    const result = await service.login('test@example.com', 'Password1');

    expect(result.requiresCountrySelection).toBe(false);
    if (!result.requiresCountrySelection) {
      expect(sesionService.createSession).toHaveBeenCalledWith(1, 1);
      expect(result.session.refreshToken).toBe('refresh-token');
    }
  });

  it('should increment intentos and block account after max attempts', async () => {
    const user = { ...activeUser, intentosFallidos: 4 };
    usuarioRepository.findOne.mockResolvedValue(user);
    usuarioRepository.save.mockImplementation(async (u) => u as Usuario);

    await expect(
      service.login('test@example.com', 'WrongPass1'),
    ).rejects.toMatchObject({
      response: { errorCode: 'AUTH_CREDENCIALES_INVALIDAS' },
    });

    expect(usuarioRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        intentosFallidos: 5,
        estado: EstadoUsuario.BLOQUEADA,
      }),
    );
  });

  it('should reject blocked accounts', async () => {
    usuarioRepository.findOne.mockResolvedValue({
      ...activeUser,
      estado: EstadoUsuario.BLOQUEADA,
    });

    await expect(
      service.login('test@example.com', 'Password1'),
    ).rejects.toMatchObject({
      response: { errorCode: 'AUTH_CUENTA_BLOQUEADA' },
    });
  });
});
