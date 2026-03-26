const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações do Express
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS) do diretório atual
app.use(express.static(path.join(__dirname)));

// Rota principal (Fallback explícito para o frontend)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Caminho do arquivo de banco de dados
const DB_FILE = path.join(__dirname, 'db.json');

// --- Rotas de Admin (Substituindo o antigo PHP) ---

// 1. Carregar Configurações
app.get('/api/load-config', (req, res) => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({});
        }
    } catch (err) {
        console.error('Erro ao ler DB:', err);
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
});

// 2. Salvar Configurações
app.post('/api/save-config', (req, res) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar DB:', err);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// Configuração do Multer para Upload de Imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 3. Upload de Arquivos
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    res.json({ url: '/uploads/' + req.file.filename });
});

// --- Rota de pagamento (Unificada para SyncPay e SuitPay) ---

app.post('/pagamento', async (req, res) => {
    try {
        const { amount, value, client, customerDetails } = req.body;
        const finalAmount = amount || value;
        const finalClient = client || customerDetails;

        if (!finalAmount || !finalClient) {
            return res.status(400).json({ error: 'Dados de pagamento incompletos (valor ou cliente ausentes).' });
        }

        // Tenta pegar configurações do db.json
        let dbConfig = {};
        if (fs.existsSync(DB_FILE)) {
            dbConfig = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }

        // --- Detecção de Gateway e Credenciais ---
        
        // 1. Prioridade para SyncPay (NOVA API: syncpay.pro)
        const syncApiKey = process.env.SYNCPAY_CLIENT_SECRET || process.env.SYNCPAY_API_KEY || dbConfig.syncpay_secret;
        // Força a nova URL conforme solicitado
        const syncUrl = process.env.SYNCPAY_BASE_URL || 'https://api.syncpay.pro';

        if (syncApiKey) {
            console.log('Utilizando Gateway: SyncPay (api.syncpay.pro)');
            
            // Autenticação: Basic Auth com API Key em Base64
            const authBase64 = Buffer.from(syncApiKey).toString('base64');

            // Payload correto conforme nova documentação SyncPay
            const payloadSync = {
                amount: parseFloat(finalAmount),
                customer: {
                    name: finalClient.name,
                    email: finalClient.email,
                    cpf: String(finalClient.document || finalClient.cpf || '').replace(/\D/g, '')
                },
                pix: {
                    expiresInDays: 1
                }
            };

            console.log('Enviando para SyncPay:', `${syncUrl}/v1/transactions`);
            
            const response = await axios.post(`${syncUrl}/v1/transactions`, payloadSync, {
                headers: {
                    'Authorization': `Basic ${authBase64}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 
            });

            console.log('Resposta SyncPay recebida com sucesso.');

            // Retorna os campos conforme nova API
            return res.json({
                qr_code: response.data?.paymentCodeBase64 || '',
                pay_in_code: response.data?.paymentCode || ''
            });
        }

        // 2. Fallback para SuitPay
        const suitId = process.env.SUIT_CI || process.env.API_KEY;
        const suitSecret = process.env.SUIT_CS || process.env.API_KEY;

        if (suitId && suitSecret) {
            console.log('Utilizando Gateway: SuitPay');
            const payloadSuit = {
                requestNumber: 'PRV_' + Date.now(),
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                amount: parseFloat(finalAmount),
                client: {
                    name: finalClient.name,
                    document: String(finalClient.document || '').replace(/\D/g, ''),
                    email: finalClient.email
                }
            };

            const response = await axios.post('https://ws.suitpay.app/api/v1/gateway/request-qrcode', payloadSuit, {
                headers: {
                    'ci': suitId,
                    'cs': suitSecret,
                    'Authorization': `Bearer ${suitSecret}`,
                    'Content-Type': 'application/json'
                }
            });

            return res.json({
                qr_code: response.data?.qr_code || response.data?.data?.qr_code || '',
                pay_in_code: response.data?.pay_in_code || response.data?.data?.pay_in_code || response.data?.pix_copy_paste || ''
            });
        }

        // Caso nenhum gateway esteja configurado
        console.error('Nenhuma credencial de API encontrada (SyncPay ou SuitPay).');
        return res.status(500).json({ 
            error: 'Erro de configuração: Credenciais de API (SYNCPAY_CLIENT_SECRET) não encontradas.' 
        });

    } catch (error) {
        console.error('Erro no processamento do pagamento:', error.message);
        if (error.response) {
            console.error('Detalhes do erro na API externa:', JSON.stringify(error.response.data));
        }
        res.status(500).json({ 
            error: 'Falha ao processar o pagamento na API externa.',
            details: error.response?.data || error.message
        });
    }
});

// Inicialização do servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando com sucesso! Acesse: http://localhost:${PORT}`);
});
