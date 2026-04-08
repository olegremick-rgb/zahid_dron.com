function renderProductPage(main, id) {
    const p = products.find(p => p.id == id);
    if(!p){ main.innerHTML = '<h1>Товар не знайдено</h1>'; return; }
    const defaultImage = p.image || 'data:image/svg+xml,%3Csvg...%3E';
    const variantsHtml = p.variants.map(v => `<button class="variant-btn-new" data-variant="${v}">${v}</button>`).join('');
    
    // Генеруємо мініатюри: спочатку головне фото, потім додаткові
    let thumbnailsHtml = `<div class="thumbnail active"><img src="${defaultImage}" alt="Головне"></div>`;
    if (p.images && p.images.length) {
        p.images.forEach(img => {
            thumbnailsHtml += `<div class="thumbnail"><img src="${img}" alt="Додаткове"></div>`;
        });
    }
    
    let specsHtml = '';
    let batteryHtml = '';
    let stackHtml = '';
    if (p.specs) {
        const lines = p.specs.split('\n');
        const specItems = [];
        let batteryValue = '';
        let stackValue = '';
        for (let line of lines) {
            if (line.toLowerCase().includes('батарея') || line.toLowerCase().includes('акумулятор')) {
                batteryValue = line.replace(/.*?:/i, '').trim();
            } else if (line.toLowerCase().includes('стек') || line.toLowerCase().includes('політний')) {
                stackValue = line.replace(/.*?:/i, '').trim();
            } else if (line.includes(':')) {
                const [key, val] = line.split(':');
                specItems.push(`<div class="spec-item"><strong>${key.trim()}</strong><span>${val.trim()}</span></div>`);
            } else if (line.trim()) {
                specItems.push(`<div class="spec-item"><strong>•</strong><span>${line.trim()}</span></div>`);
            }
        }
        specsHtml = specItems.join('');
        if (batteryValue || stackValue) {
            batteryHtml = `<div class="battery-item"><h4>БАТАРЕЯ</h4><p>${batteryValue || '—'}</p></div>`;
            stackHtml = `<div class="stack-item"><h4>ПОЛІТНИЙ СТЕК</h4><p>${stackValue || '—'}</p></div>`;
        }
    } else {
        specsHtml = '<div class="spec-item"><span>Характеристики не додані</span></div>';
    }
    const batteryStackHtml = (batteryHtml || stackHtml) ? `<div class="battery-stack">${batteryHtml}${stackHtml}</div>` : '';
    
    main.innerHTML = `
        <div class="product-page">
            <div class="product-gallery">
                <div class="main-image"><img src="${defaultImage}" alt="${p.name}" id="mainProductImage"></div>
                <div class="thumbnail-list" id="thumbnailList">${thumbnailsHtml}</div>
            </div>
            <div class="product-info-new">
                <h1 class="product-title">${p.name}</h1>
                <div class="product-price-new">${p.price.toLocaleString()} грн</div>
                <div class="specs-list">${specsHtml}</div>
                ${batteryStackHtml}
                <div class="variants-section"><h3>Варіанти:</h3><div class="variant-buttons" id="variantButtons">${variantsHtml}</div></div>
                <div class="buy-section">
                    <div class="buy-price">${p.price.toLocaleString()} грн</div>
                    <div class="buy-form">
                        <input type="text" id="orderNameProduct" placeholder="Ваше ім'я">
                        <input type="tel" id="orderPhoneProduct" placeholder="Номер телефону">
                        <input type="text" id="orderVariantProduct" placeholder="Оберіть варіант" readonly>
                        <button class="buy-btn" onclick="placeOrderProduct(${p.id})">Купити</button>
                    </div>
                </div>
                <div class="product-tabs">
                    <div class="tabs-header">
                        <button class="tab-btn active" data-tab="desc">Опис</button>
                        <button class="tab-btn" data-tab="specs">Характеристики</button>
                        <button class="tab-btn" data-tab="delivery">Доставка</button>
                    </div>
                    <div class="tab-content active" id="tab-desc">${p.description || 'Опис відсутній'}</div>
                    <div class="tab-content" id="tab-specs">${p.specs ? p.specs.replace(/\n/g, '<br>') : 'Не додано'}</div>
                    <div class="tab-content" id="tab-delivery">Доставка по всій Україні протягом 1-3 днів. Самовивіз з м. Львів.</div>
                </div>
            </div>
        </div>
    `;
    
    // Обробник для мініатюр
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, idx) => {
        thumb.addEventListener('click', () => {
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            const imgSrc = thumb.querySelector('img').src;
            document.getElementById('mainProductImage').src = imgSrc;
        });
    });
    
    // Обробники для варіантів
    document.querySelectorAll('.variant-btn-new').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.variant-btn-new').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('orderVariantProduct').value = btn.getAttribute('data-variant');
        });
    });
    
    // Обробники для табів
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}
