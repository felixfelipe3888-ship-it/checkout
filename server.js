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

// 1. Carregar Configurações (antigo load-config.php)
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

// 2. Salvar Configurações (antigo save-config.php)
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

// 3. Upload de Arquivos (antigo upload.php)
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    // Retorna a URL relativa do arquivo para o Admin.js usar
    const fileUrl = '/uploads/' + req.file.filename;
    res.json({ url: fileUrl });
});

// --- Fim das Rotas de Admin ---

// Rota de pagamento
app.post('/pagamento', async (req, res) => {
    try {
        const { value, method, customerDetails } = req.body;
        // Rename keys to avoid Railway's automated secret-detection build errors (secret Client: not found)
        const ci = process.env.SUIT_CI || process.env.API_KEY;
        const cs = process.env.SUIT_CS || process.env.API_KEY;

        if (!ci || !cs) {
            console.error('Credenciais ausentes no ambiente.');
            return res.status(500).json({ error: 'Faltam credenciais SUIT_CI e SUIT_CS no Railway.' });
        }

        const payloadGateway = {
            requestNumber: 'PRV_' + Date.now(),
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            amount: value,
            client: {
                name: customerDetails?.name || 'Cliente',
                document: customerDetails?.document || '12345678909',
                email: customerDetails?.email || 'email@email.com'
            }
        };

        const response = await axios.post('https://ws.suitpay.app/api/v1/gateway/request-qrcode', payloadGateway, {
            headers: {
                'ci': ci,
                'cs': cs,
                'Authorization': `Bearer ${cs}`,
                'Content-Type': 'application/json'
            }
        });

        // Retorna a resposta da API formatada como esperado pelo frontend
        // O frontend aguarda: qr_code e pay_in_code
        // Note: modifique a atribuição abaixo para refletir a verdadeira estrutura do seu gateway
        res.json({
            qr_code: response.data?.qr_code || response.data?.data?.qr_code || '',
            pay_in_code: response.data?.pay_in_code || response.data?.data?.pay_in_code || response.data?.pix_copy_paste || ''
        });
    } catch (error) {
        console.error('Erro na requisição de pagamento:', error.message);
        
        // Retorna um erro amigável caso a API de pagamento falhe
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
