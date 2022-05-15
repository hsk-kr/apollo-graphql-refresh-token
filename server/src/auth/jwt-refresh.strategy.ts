import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwtRefresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req.cookies?.['refresh-token'],
      ]),
      secretOrKey: process.env.REFRESH_TOKEN_SECRET,
    });
  }

  async validate(payload: any) {
    return { user: payload.user };
  }
}
