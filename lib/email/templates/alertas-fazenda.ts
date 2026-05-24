import { AlertaEmail } from '@/lib/services/alertas-email'

const TITULOS: Record<AlertaEmail['tipo'], string> = {
  autonomia_silagem: 'Silagem com estoque baixo',
  perdas_silagem: 'Alta taxa de perdas',
  ocupacao_vencida: 'Animais além do prazo no piquete',
  piquete_pronto: 'Piquete pronto para entrada',
}

export function gerarEmailAlertasFazenda(
  fazendaNome: string,
  alertas: AlertaEmail[],
  appUrl: string
): string {
  const blocosAlertas = alertas
    .map(
      (alerta) => `
    <div style="border-left:3px solid #f5d000;padding:12px 16px;background:#222222;border-radius:0 6px 6px 0;margin:12px 0">
      <p style="color:#f5d000;font-weight:700;margin:0 0 4px;font-size:13px">⚠️ ${TITULOS[alerta.tipo]}</p>
      <p style="color:#ffffff;margin:0;font-size:14px;line-height:1.6">${alerta.detalhe}</p>
    </div>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px;background:#161616;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto">
    <div style="background:#222222;padding:28px 32px;border-radius:12px 12px 0 0">
      <p style="color:#ffffff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.5px">GestSilo</p>
      <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:4px 0 0">Plataforma de Gestão Agrícola</p>
    </div>
    <div style="background:#1c1c1c;padding:32px;border-radius:0 0 12px 12px">
      <p style="color:#ffffff;font-size:15px;margin:0 0 16px;line-height:1.6">
        Olá, você tem <strong style="color:#f5d000">${alertas.length} alerta(s)</strong>
        na fazenda <strong>${fazendaNome}</strong> que precisam de atenção:
      </p>
      ${blocosAlertas}
      <a href="${appUrl}/dashboard"
         style="display:inline-block;background:#00A651;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;margin-top:24px">
        Ver no dashboard
      </a>
      <hr style="border:none;border-top:1px solid #333;margin:28px 0"/>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0">
        Você recebe este email porque é Administrador da fazenda ${fazendaNome}.<br/>
        © 2026 GestSilo · Todos os direitos reservados
      </p>
    </div>
  </div>
</body>
</html>`
}
