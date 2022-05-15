import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

@Module({
  imports: [
    // For using environment variables throguh @nestjs/config
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: process.env.ACCESS_TOKEN_SECRET,
        signOptions: {
          expiresIn: process.env.ACCESS_TOKEN_EXPIRATION,
        },
      }),
    }),
  ],
  providers: [AuthResolver, AuthService, JwtStrategy, JwtRefreshStrategy],
})
export class AuthModule {}
