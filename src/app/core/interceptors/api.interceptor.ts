import { HttpInterceptorFn } from '@angular/common/http';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../../environments/environment';
import { SESSION_TOKEN_KEY } from '../services/user';

const API_HOST = 'angelesmedic.com.mx';

// These actions authenticate the user — no session token exists yet at that point
const PUBLIC_ACTIONS = new Set(['login_user', 'register_user']);

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes(API_HOST)) return next(req);

  // GET requests (doctors list, etc.) — api_key as header
  if (req.method !== 'POST' || !req.body || typeof req.body !== 'object') {
    return next(req.clone({ headers: req.headers.set('X-Api-Key', environment.apiKey) }));
  }

  const body = req.body as Record<string, unknown>;
  const action = (body['action'] as string) ?? '';

  // Login / register always use api_key (no token exists yet)
  if (PUBLIC_ACTIONS.has(action)) {
    return next(req.clone({ body: { ...body, api_key: environment.apiKey } }));
  }

  // Protected endpoints: use session token when available; fall back to api_key
  // during transition (users who haven't re-logged in since the server update).
  return from(Preferences.get({ key: SESSION_TOKEN_KEY })).pipe(
    switchMap(({ value: token }) => {
      const authBody = token
        ? { ...body, token }
        : { ...body, api_key: environment.apiKey };
      return next(req.clone({ body: authBody }));
    })
  );
};
