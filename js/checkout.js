// suitpay_checkout.js

let currentPlanPrice = 0;

function syncModalImages() {
    // Tenta pegar do profile primeiro, senao usa fallback
    const coverElement = document.getElementById('prof_cover');
    const avatarElement = document.getElementById('prof_avatar');
    
    if(coverElement && coverElement.src) {
        document.getElementById('suitpayBanner').src = coverElement.src;
    }
    if(avatarElement && avatarElement.src) {
        document.getElementById('suitpayAvatar').src = avatarElement.src;
    }
}

function openSuitPayModal(planName, priceStr) {
    document.getElementById('suitpayPlanName').innerText = 'Assinatura - ' + planName;
    document.getElementById('suitpayPlanPrice').innerText = 'R$ ' + priceStr;
    
    // Converte R$ 19,99 para 19.99 (número)
    const numericPrice = parseFloat(priceStr.replace('.', '').replace(',', '.'));
    currentPlanPrice = numericPrice;
    
    syncModalImages();
    
    // Reset forms
    document.getElementById('suitpayForm').style.display = 'block';
    document.getElementById('suitpayPixArea').style.display = 'none';
    document.getElementById('suitpayForm').reset();
    
    document.getElementById('suitpayModal').style.display = 'flex';
}

function closeSuitPayModal() {
    document.getElementById('suitpayModal').style.display = 'none';
}

function maskCpf(input) {
    let v = input.value.replace(/\D/g,"");
    v = v.replace(/(\d{3})(\d)/,"$1.$2");
    v = v.replace(/(\d{3})(\d)/,"$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/,"$1-$2");
    input.value = v;
}

// Generate random order number
function generateRequestNumber() {
    return 'PRV_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// Format Date for DueDate (+1 day)
function getDueDateString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

async function handleSuitPaySubmit(event) {
    event.preventDefault();

    if (window.location.protocol === 'file:') {
        alert('ERRO: Você abriu o arquivo direto da pasta (protocolo file://). Para o checkout funcionar, o projeto precisa ser visualizado através de um servidor (como o da Netlify) ou rodado localmente com ferramentas como "Live Server".');
        return;
    }
    
    const name = document.getElementById('spName').value;
    const email = document.getElementById('spEmail').value;
    const cpfInput = document.getElementById('spCpf');
    const cpf = cpfInput ? cpfInput.value.replace(/\D/g, "") : "12345678909"; 

    const btn = document.getElementById('spSubmitBtn');
    const originalBtnText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PIX...';
    btn.disabled = true;

    try {
        const payload = {
            amount: currentPlanPrice,
            client: {
                name: name,
                document: cpf,
                email: email
            }
        };

        // Detector de Base URL (Para testes locais e produção)
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const backendUrl = (isLocal && window.location.port !== '3000') 
            ? 'http://localhost:3000/pagamento' 
            : '/pagamento';

        console.log('--- Iniciando Requisição de Pagamento ---');
        console.log('URL de destino:', backendUrl);

        let response;
        try {
            response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error('Erro de conexão:', e);
            throw new Error('Não foi possível conectar ao servidor. Verifique se o backend (Node.js) está rodando na porta 3000.');
        }

        let data;
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try { errorData = JSON.parse(errorText); } catch(e) { errorData = { error: errorText }; }
            
            console.error("❌ Erro do Servidor:", errorData);
            throw new Error(errorData.error || errorData.details || 'Erro interno no processamento.');
        }

        data = await response.json();
        console.log('✅ Dados recebidos:', data);

        if (data.qr_code) {
            document.getElementById('suitpayForm').style.display = 'none';
            document.getElementById('suitpayPixArea').style.display = 'block';
            
            const qrRaw = data.qr_code || '';
            document.getElementById('spQrCode').src = qrRaw.startsWith('data:')
                ? qrRaw
                : 'data:image/png;base64,' + qrRaw;

            document.getElementById('spCopyPaste').value = data.pay_in_code || '';
        } else {
            throw new Error(data.message || 'O gateway não retornou um QR Code válido.');
        }
    } catch(err) {
        console.error('Erro Fatal:', err);
        alert('ERRO AO GERAR PIX:\n' + err.message);
    } finally {
        btn.innerHTML = originalBtnText;
        btn.disabled = false;
    }
}

function copyPixCode() {
    const copyText = document.getElementById('spCopyPaste');
    if(!copyText || !copyText.value) return alert('Nenhum código para copiar.');
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert('Código PIX copiado com sucesso!');
    }).catch(err => {
        alert('Falha ao copiar.');
    });
}
