const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3030;

// Configurações do Express
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS) do diretório atual
app.use(express.static(path.join(__dirname)));

// Rota principal (Unificada)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Caminho do arquivo de banco de dados
const DB_FILE = path.join(__dirname, 'db.json');

// --- Rotas de Admin ---

app.get('/api/load-config', (req, res) => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({});
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
});

app.post('/api/save-config', (req, res) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'file-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    res.json({ url: '/uploads/' + req.file.filename });
});

// --- Rota de Pagamento (PUSHINPAY) ---

app.post('/pagamento', async (req, res) => {
    try {
        const { amount } = req.body;
        
        let dbConfig = {};
        if (fs.existsSync(DB_FILE)) {
            try { dbConfig = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) {}
        }

        const HARDCODED_TOKEN = '64434|qlpNhgXR6IKWr5KKLcxGr5KyeyiQaEOn1SyzduKVdda6701c';
        const TOKEN = process.env.PUSHINPAY_TOKEN || dbConfig.syncpay_secret || HARDCODED_TOKEN;

        if (!amount) return res.status(400).json({ error: 'Valor não informado.' });

        console.log('--- Requisitando PIX a PushinPay ---');
        console.log('Valor:', amount);

        // PushinPay exige o valor em centavos (integer)
        const valueCents = Math.round(parseFloat(amount) * 100);

        const payload = {
            value: valueCents,
            webhook_url: '' 
        };

        const response = await axios.post('https://api.pushinpay.com.br/api/pix/cashIn', payload, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 20000
        });

        const data = response.data;
        console.log('✅ Sucesso da PushinPay!');

        return res.json({
            qr_code: data.qr_code_base64 || data.qrCodeBase64 || '',
            pay_in_code: data.copy_and_paste || data.qr_code || ''
        });

    } catch (error) {
        console.error('❌ Erro na PushinPay API!');
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
        const fullDetails = error.response?.data || {};
        
        console.error('Mensagem:', errorMsg);
        console.error('Detalhes Completos:', JSON.stringify(fullDetails));

        res.status(500).json({ 
            error: 'Falha na PushinPay: ' + errorMsg,
            details: fullDetails 
        });
    }
});

app.get('/status', (req, res) => res.json({ status: 'Online', gateway: 'PushinPay' }));

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
