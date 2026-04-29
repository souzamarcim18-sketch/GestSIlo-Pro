import { filterSensitiveData, sanitizeString } from './sentry.server.config';

/**
 * Sentry client configuration
 * Initialized automatically by @sentry/nextjs via next.config.ts
 * This module provides additional filtering for sensitive data
 */

export const sentryBeforeSendHandler = (event: any, hint: any) => {
  // Filtro de dados sensíveis antes de enviar ao Sentry
  if (event.request) {
    filterSensitiveData(event.request);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb: any) => {
      if (breadcrumb.data) {
        filterSensitiveData(breadcrumb.data);
      }
      return breadcrumb;
    });
  }

  if (event.exception) {
    event.exception.values?.forEach((exc: any) => {
      if (exc.value) {
        exc.value = sanitizeString(exc.value);
      }
    });
  }

  // Filtrar contexto do usuário
  if (event.user) {
    event.user = {
      id: event.user.id,
    };
  }

  return event;
};
