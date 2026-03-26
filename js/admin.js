// Logic for Admin Dashboard

const inputs = {
    name: document.getElementById('input_name'),
    username: document.getElementById('input_username'),
    bio: document.getElementById('input_bio'),
    photos: document.getElementById('input_photos'),
    videos: document.getElementById('input_videos'),
    locks: document.getElementById('input_locks'),
    hearts: document.getElementById('input_hearts'),
    avatar: document.getElementById('input_avatar'),
    cover: document.getElementById('input_cover'),
    price1: document.getElementById('input_price1'),
    price3: document.getElementById('input_price3'),
    price6: document.getElementById('input_price6'),
    link1: document.getElementById('input_link1'),
    link3: document.getElementById('input_link3'),
    link6: document.getElementById('input_link6'),
    video_feed: document.getElementById('input_video'), // Renomeado para evitar conflitos
    cookies: document.getElementById('input_cookies'),
    instagram: document.getElementById('input_instagram'),
    langBtn: document.getElementById('input_lang_btn'),
    
    // New Media fields
    media1: document.getElementById('input_media1'),
    media2: document.getElementById('input_media2'),
    media3: document.getElementById('input_media3'),
    media4: document.getElementById('input_media4'),
    media5: document.getElementById('input_media5'),
    
    // New Checkout Customization fields
    ck_banner: document.getElementById('input_ck_banner'),
    ck_avatar: document.getElementById('input_ck_avatar'),
    ck_minitext: document.getElementById('input_ck_minitext'),
    ck_anchor: document.getElementById('input_ck_anchor'),
    ck_timer_on: document.getElementById('input_ck_timer_on'),
    ck_time: document.getElementById('input_ck_time'),
    
    // PushinPay Token field (reused from syncpay_secret in db.json for compatibility)
    pushinpay_token: document.getElementById('input_syncpay_secret')
};

const uploads = {
    avatar: document.getElementById('upload_avatar_file'),
    cover: document.getElementById('upload_cover_file'),
    video: document.getElementById('upload_video_file'),
    media1: document.getElementById('upload_media1_file'),
    media2: document.getElementById('upload_media2_file'),
    media3: document.getElementById('upload_media3_file'),
    media4: document.getElementById('upload_media4_file'),
    media5: document.getElementById('upload_media5_file'),
    ck_banner: document.getElementById('upload_ck_banner_file'),
    ck_avatar: document.getElementById('upload_ck_avatar_file')
};

const iframe = document.getElementById('preview_iframe');

// Load saved data from Server
window.addEventListener('load', async () => {
    try {
        const response = await fetch('/api/load-config');
        const data = await response.json();
        const finalData = Object.keys(data).length > 0 ? data : JSON.parse(localStorage.getItem('profileData') || '{}');

        if (finalData) {
            if(inputs.name) inputs.name.value = finalData.n || '';
            if(inputs.username) inputs.username.value = finalData.u || '';
            if(inputs.bio) inputs.bio.value = finalData.b || '';
            if(inputs.photos) inputs.photos.value = finalData.ph || '';
            if(inputs.videos) inputs.videos.value = finalData.vi || '';
            if(inputs.locks) inputs.locks.value = finalData.lo || '';
            if(inputs.hearts) inputs.hearts.value = finalData.he || '';
            if(inputs.avatar) inputs.avatar.value = finalData.av || '';
            if(inputs.cover) inputs.cover.value = finalData.co || '';
            if(inputs.price1) inputs.price1.value = finalData.p1 || '';
            if(inputs.price3) inputs.price3.value = finalData.p3 || '';
            if(inputs.price6) inputs.price6.value = finalData.p6 || '';
            if(inputs.link1) inputs.link1.value = finalData.l1 || '';
            if(inputs.link3) inputs.link3.value = finalData.l3 || '';
            if(inputs.link6) inputs.link6.value = finalData.l6 || '';
            if(inputs.video_feed) inputs.video_feed.value = finalData.vd || '';
            if(inputs.cookies) inputs.cookies.checked = finalData.ck !== false;
            if(inputs.instagram) inputs.instagram.value = finalData.ig || '';
            if(inputs.langBtn) inputs.langBtn.checked = finalData.lb !== false;
            
            if(inputs.media1) inputs.media1.value = finalData.m1 || '';
            if(inputs.media2) inputs.media2.value = finalData.m2 || '';
            if(inputs.media3) inputs.media3.value = finalData.m3 || '';
            if(inputs.media4) inputs.media4.value = finalData.m4 || '';
            if(inputs.media5) inputs.media5.value = finalData.m5 || '';
            
            if(inputs.ck_banner) inputs.ck_banner.value = finalData.ckb || '';
            if(inputs.ck_avatar) inputs.ck_avatar.value = finalData.cka || '';
            if(inputs.ck_minitext) inputs.ck_minitext.value = finalData.ckmt || 'Cobrado de forma segura';
            if(inputs.ck_anchor) inputs.ck_anchor.value = finalData.ckanc || 'R$ 149,99';
            if(inputs.ck_timer_on) inputs.ck_timer_on.checked = finalData.ckton !== false;
            if(inputs.ck_time) inputs.ck_time.value = finalData.ckt || '15';

            if(inputs.pushinpay_token) inputs.pushinpay_token.value = finalData.syncpay_secret || '';
        }
    } catch (e) {
        console.error('Erro ao carregar do servidor:', e);
    }
    updatePreview();
});

if (iframe) {
    iframe.onload = () => updatePreview();
}

Object.values(inputs).forEach(input => {
    if(input) {
        input.addEventListener('input', updatePreview);
        input.addEventListener('change', updatePreview);
    }
});

// File Uploads
Object.keys(uploads).forEach(key => {
    if(uploads[key]) {
        uploads[key].addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const label = e.target.previousElementSibling;
            const originalIcon = label.innerHTML;
            label.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', { method: 'POST', body: formData });
                const result = await response.json();
                if (result.url) {
                    const fileUrl = result.url;
                    if (key === 'avatar') inputs.avatar.value = fileUrl;
                    else if (key === 'cover') inputs.cover.value = fileUrl;
                    else if (key === 'video') inputs.video_feed.value = fileUrl;
                    else if (key === 'media1') inputs.media1.value = fileUrl;
                    else if (key === 'media2') inputs.media2.value = fileUrl;
                    else if (key === 'media3') inputs.media3.value = fileUrl;
                    else if (key === 'media4') inputs.media4.value = fileUrl;
                    else if (key === 'media5') inputs.media5.value = fileUrl;
                    else if (key === 'ck_banner') inputs.ck_banner.value = fileUrl;
                    else if (key === 'ck_avatar') inputs.ck_avatar.value = fileUrl;
                    label.innerHTML = '<i class="fas fa-check"></i>';
                } else { throw new Error('Falha no upload'); }
            } catch (err) {
                console.error(err);
                label.innerHTML = '<i class="fas fa-times"></i>';
            } finally {
                setTimeout(() => label.innerHTML = originalIcon, 2000);
                updatePreview();
            }
        });
    }
});

function getData() {
    return {
        n: inputs.name ? inputs.name.value : '',
        u: inputs.username ? inputs.username.value : '',
        b: inputs.bio ? inputs.bio.value : '',
        ph: inputs.photos ? inputs.photos.value : '',
        vi: inputs.videos ? inputs.videos.value : '',
        lo: inputs.locks ? inputs.locks.value : '',
        he: inputs.hearts ? inputs.hearts.value : '',
        av: inputs.avatar ? inputs.avatar.value : '',
        co: inputs.cover ? inputs.cover.value : '',
        p1: inputs.price1 ? inputs.price1.value : '',
        p3: inputs.price3 ? inputs.price3.value : '',
        p6: inputs.price6 ? inputs.price6.value : '',
        l1: inputs.link1 ? inputs.link1.value : '',
        l3: inputs.link3 ? inputs.link3.value : '',
        l6: inputs.link6 ? inputs.link6.value : '',
        vd: inputs.video_feed ? inputs.video_feed.value : '',
        ck: inputs.cookies ? inputs.cookies.checked : true,
        ig: inputs.instagram ? inputs.instagram.value : '',
        lb: inputs.langBtn ? inputs.langBtn.checked : true,
        bl: inputs.video_feed ? inputs.video_feed.value : '',
        m1: inputs.media1 ? inputs.media1.value : '',
        m2: inputs.media2 ? inputs.media2.value : '',
        m3: inputs.media3 ? inputs.media3.value : '',
        m4: inputs.media4 ? inputs.media4.value : '',
        m5: inputs.media5 ? inputs.media5.value : '',
        ckb: inputs.ck_banner ? inputs.ck_banner.value : '',
        cka: inputs.ck_avatar ? inputs.ck_avatar.value : '',
        ckmt: inputs.ck_minitext ? inputs.ck_minitext.value : '',
        ckanc: inputs.ck_anchor ? inputs.ck_anchor.value : '',
        ckton: inputs.ck_timer_on ? inputs.ck_timer_on.checked : true,
        ckt: inputs.ck_time ? inputs.ck_time.value : '15',
        syncpay_secret: inputs.pushinpay_token ? inputs.pushinpay_token.value : ''
    };
}

function updatePreview(forceReload = false) {
    const data = getData();
    if (forceReload && iframe) {
        const currentSrc = iframe.src;
        iframe.src = '';
        iframe.src = currentSrc;
        return;
    }
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'UPDATE_PROFILE', data }, '*');
    }
}

async function saveData(e) {
    const data = getData();
    const btn = (e && e.currentTarget) || document.querySelector('button[onclick*="saveData"]');
    const originalText = btn ? btn.innerHTML : 'Salvar';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
    }
    try {
        const response = await fetch('/api/save-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            localStorage.setItem('profileData', JSON.stringify(data));
            if (btn) { btn.innerHTML = '<i class="fas fa-check"></i>'; btn.style.background = '#28a745'; }
        } else { throw new Error('Erro ao salvar'); }
    } catch (e) {
        console.error(e);
        localStorage.setItem('profileData', JSON.stringify(data));
    } finally {
        if (btn) {
            btn.disabled = false;
            setTimeout(() => { btn.innerHTML = originalText; btn.style.background = '#444'; }, 2000);
        }
        updatePreview();
    }
}

function generateLink() {
    const data = getData();
    const jsonStr = JSON.stringify(data);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    const url = new URL(window.location.href);
    const path = url.pathname.substring(0, url.pathname.lastIndexOf('/') + 1);
    const finalUrl = `${url.origin}${path}profile.html?d=${encodeURIComponent(encoded)}`;
    navigator.clipboard.writeText(finalUrl).then(() => alert('Link copiado!'));
}

async function exportZip() {
    const data = getData();
    if (!data.syncpay_secret) {
        if (!confirm('Token PushinPay não preenchido. O PIX não funcionará no ZIP. Deseja continuar?')) return;
    }
    const zip = new JSZip();
    const btn = document.querySelector('button[onclick="exportZip()"]');
    if(btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }

    try {
        const response = await fetch('profile.html');
        let htmlContent = await response.text();
        const zipData = JSON.parse(JSON.stringify(data));
        const mediaUrls = [];
        const sanitizeUrl = (url) => {
            if (!url || typeof url !== 'string' || !url.includes('/uploads/')) return url;
            const relativePath = 'uploads/' + url.split('/uploads/').pop();
            mediaUrls.push({ original: url, zipPath: relativePath });
            return relativePath;
        };
        const mediaKeys = ['av', 'co', 'vd', 'bl', 'm1', 'm2', 'm3', 'm4', 'm5', 'ckb', 'cka'];
        mediaKeys.forEach(k => { zipData[k] = sanitizeUrl(zipData[k]); });

        const scriptBake = `<script>const preloadedData = ${JSON.stringify(zipData)}; window.addEventListener('load', () => { if (typeof loadProfile === 'function') loadProfile(preloadedData); });<\/script>`;
        htmlContent = htmlContent.replace('</body>', scriptBake + '</body>');
        zip.file("index.html", htmlContent);
        
        const assets = ['css/premium.css', 'css/checkout.css', 'images/logo-black.svg'];
        for (const file of assets) {
            try {
                const res = await fetch(file);
                if (res.ok) zip.file(file, await res.blob());
            } catch(e) {}
        }

        zip.file("LEIA-ME.txt", "Configuração PushinPay:\n1. Coloque seu TOKEN no arquivo server.js se for rodar via Node.\n2. Este ZIP contém apenas o frontend estático com dados pré-carregados.");

        for (const media of mediaUrls) {
            try {
                const res = await fetch(media.original);
                if (res.ok) zip.file(media.zipPath, await res.blob());
            } catch(e) {}
        }
        
        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, `premium_pushinpay.zip`);
    } catch (error) { alert('Erro ao gerar ZIP'); }
    finally { if(btn) { btn.innerHTML = '<i class="fas fa-file-archive"></i> ZIP'; btn.disabled = false; } }
}
