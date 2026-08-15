import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  projectId?: string | null;
  permissions?: string[];
  roleNames?: string[];
  projectIds?: string[];
  employeeId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roleAssignments: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        projectAssignments: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User not found or inactive");
    }

    const permissions = new Set<string>();
    const roleNames = new Set<string>();
    for (const assignment of user.roleAssignments) {
      roleNames.add(assignment.role.name);
      for (const rp of assignment.role.permissions) {
        permissions.add(rp.permission.name);
      }
    }

    const projectIds = user.projectAssignments.map((a) => a.projectId);

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      projectId: user.projectId,
      permissions: Array.from(permissions),
      roleNames: Array.from(roleNames),
      projectIds,
      employeeId: user.employeeId,
    };
  }
}
