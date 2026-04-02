export const config = {
    api: {
        bodyParser: {
            sizeLimit: '12mb',
        },
    },
};

function maskEmail(value) {
    const email = String(value || '').trim().toLowerCase();
    const atIndex = email.indexOf('@');

    if (atIndex <= 1) {
        return 'redacted';
    }

    return `${email.slice(0, 2)}***${email.slice(atIndex)}`;
}

export default function handler(request, response) {
    if (process.env.NODE_ENV === 'production') {
        response.setHeader('Allow', 'POST');
        return response.status(404).json({ message: 'Not found.' });
    }

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ message: 'Method not allowed.' });
    }

    const lead = request.body?.lead || {};
    const drawingMeta = lead?.drawingImage
        ? {
              name: lead.drawingImage.name,
              type: lead.drawingImage.type,
              size: lead.drawingImage.size,
          }
        : null;

    // Development-only webhook sink so local lead submissions can complete without external infra.
    console.log('[lead-dev-webhook] Received lead payload', {
        submittedAt: request.body?.submittedAt,
        nameLength: String(lead?.name || '').trim().length,
        maskedEmail: maskEmail(lead?.email),
        routeId: request.body?.metadata?.routeId,
        drawingImage: drawingMeta,
    });

    return response.status(202).json({ message: 'Lead captured by local development webhook.' });
}
