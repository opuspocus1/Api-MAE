// netlify/functions/mae-api.js
const fetch = require('node-fetch');

const MAE_CONFIG = {
    baseUrl: 'https://api.mae.com.ar/MarketData/v1',
    apiKey: 'nuDX73vj2483KSUgvenkj9t50oA0vgvA4WcuRAER'
};

exports.handler = async (event, context) => {
    // Headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Solo permitir GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Extraer el endpoint de la URL
        const path = event.path.replace('/.netlify/functions/mae-api', '');
        const queryParams = event.queryStringParameters || {};

        // Validar que sea un endpoint válido
        const validEndpoints = [
            '/mercado/cotizaciones/rentafija',
            '/mercado/cotizaciones/forex',
            '/mercado/cotizaciones/cauciones',
            '/mercado/cotizaciones/derivados'
        ];

        if (!validEndpoints.includes(path)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid endpoint',
                    validEndpoints: validEndpoints
                })
            };
        }

        // Construir URL para MAE API
        const url = new URL(`${MAE_CONFIG.baseUrl}${path}`);
        
        // Agregar parámetros de consulta
        Object.keys(queryParams).forEach(key => {
            if (queryParams[key] !== undefined && queryParams[key] !== null && queryParams[key] !== '') {
                url.searchParams.append(key, queryParams[key]);
            }
        });

        console.log('Consultando MAE API:', url.toString());

        // Hacer petición a MAE
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'x-api-key': MAE_CONFIG.apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'Netlify-Function-MAE-Proxy/1.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error de MAE API:', response.status, errorText);
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: `MAE API Error`,
                    status: response.status,
                    message: errorText
                })
            };
        }

        const data = await response.json();
        
        // Extraer información de paginación
        const paginationHeader = response.headers.get('x-pagination');
        let pagination = null;
        if (paginationHeader) {
            try {
                pagination = JSON.parse(paginationHeader);
            } catch (e) {
                console.warn('No se pudo parsear paginación');
            }
        }

        // Respuesta exitosa
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: data,
                pagination: pagination,
                timestamp: new Date().toISOString(),
                source: 'MAE API via Netlify Function'
            })
        };

    } catch (error) {
        console.error('Error en función:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            })
        };
    }
};
