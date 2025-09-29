// لوحة إدارة السيارات - تخزين محلي مع استيراد/تصدير JSON
// - CRUD كامل
// - بحث وفرز
// - حماية بكلمة مرور بسيطة

(function(){
  const STORAGE_KEY = 'showroom.cars.v1';
  const PASS_KEY = 'showroom.admin.pass.v1';
  const SESSION_KEY = 'showroom.admin.session.v1';
  const DEFAULT_PASS = 'admin123'; // يمكنك تغييره من هنا

  // === Supabase ===
  const hasSupabaseConfig = typeof window.SUPABASE_URL === 'string' && typeof window.SUPABASE_ANON_KEY === 'string';
  let supabase = null;
  if (hasSupabaseConfig && window.supabase) {
    // استخدم عميلًا واحدًا عالميًا لتفادي تحذير Multiple GoTrueClient
    window.__sbClient = window.__sbClient || window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
      {
        auth: {
          storageKey: 'cars-admin-auth',
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );
    supabase = window.__sbClient;
  }
  const USE_SUPABASE = !!supabase; // تشغيل التكامل إذا توافرت الإعدادات
  const TABLE = 'cars'; // اسم الجدول في Supabase

  // عناصر DOM
  const els = {
    list: document.getElementById('list'),
    count: document.getElementById('count'),
    search: document.getElementById('search'),
    sort: document.getElementById('sort'),
    resetFilters: document.getElementById('btnResetFilters'),

    form: document.getElementById('carForm'),
    make: document.getElementById('make'),
    model: document.getElementById('model'),
    year: document.getElementById('year'),
    price: document.getElementById('price'),
    mileage: document.getElementById('mileage'),
    seats: document.getElementById('seats'),
    transmission: document.getElementById('transmission'),
    fuel: document.getElementById('fuel'),
    images: document.getElementById('images'),
    imageFiles: document.getElementById('imageFiles'),
    tags: document.getElementById('tags'),
    description: document.getElementById('description'),

    formStatus: document.getElementById('formStatus'),
    btnNew: document.getElementById('btnNew'),
    btnDelete: document.getElementById('btnDelete'),
    btnResetForm: document.getElementById('btnResetForm'),
    btnSaveAll: document.getElementById('btnSaveAll'),
    btnExport: document.getElementById('btnExport'),
    importFile: document.getElementById('importFile'),

    auth: document.getElementById('auth'),
    authPass: document.getElementById('authPass'),
    authSubmit: document.getElementById('authSubmit'),
    authError: document.getElementById('authError')
  };

  // نموذج البيانات
  /** @typedef {{id:string, images:string[], make:string, model:string, year:number, mileage:number, price:number, transmission:string, fuel:string, seats:number, description:string, tags:string[]}} Car */

  /** @type {Car[]} */
  let cars = [];
  /** @type {Car|null} */
  let active = null;

  // أدوات مساعدة
  const clone = o => JSON.parse(JSON.stringify(o));
  const priceJOD = n => `JOD ${Number(n).toLocaleString('en-US')}`;
  const byId = id => document.getElementById(id);

  // جلب القائمة من Supabase أو LocalStorage مع مرونة في ترتيب الأعمدة (fallback)
  async function db_list(){
    // إذا كانت إعدادات Supabase مفعّلة
    if(USE_SUPABASE){
      const tryFetch = async (orderCol)=>{
        let q = supabase.from(TABLE).select('*');
        if(orderCol){ q = q.order(orderCol, { ascending:false }); }
        return await q;
      };
      try{
        // جرّب أولاً created_at ثم inserted_at ثم بلا ترتيب
        let res = await tryFetch('created_at');
        if(res.error && res.error.code === '42703'){ res = await tryFetch('inserted_at'); }
        if(res.error && res.error.code === '42703'){ res = await tryFetch(null); }
        if(res.error) throw res.error;

        const arr = (res.data||[]).map(normalizeCar).filter(Boolean);
        // خزن نسخة محلية كاحتياط
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        return arr;
      }catch(e){
        console.error('Supabase list failed:', e);
        // متابعة بالوضع المحلي
      }
    }
    // قراءة من التخزين المحلي
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return local.map(normalizeCar).filter(Boolean);
  }

  async function loadCars(){
    try{
      const cloud = await db_list();
      // لا تمس البيانات المحلية إن كانت السحابة فارغة
      if(cloud && cloud.length > 0){
        cars = cloud;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cars)); // مزامنة كاش
      } else {
        // استخدم الموجود محليًا أو أنشئ بيانات افتراضية مرة واحدة
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if(local.length > 0){
          cars = local;
        } else {
          cars = [
            { id: 'toyota-corolla-2021', images:['https://picsum.photos/seed/corolla-1/800/500','https://picsum.photos/seed/corolla-2/800/500','https://picsum.photos/seed/corolla-3/800/500'], make:'Toyota', model:'Corolla', year:2021, mileage:32000, price:14500, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'تويوتا كورولا بحالة ممتازة، صيانة دورية وكفاءة عالية في الاستهلاك.', tags:['اقتصادية','مضمونة','صيانة دورية'] },
            { id: 'hyundai-tucson-2020', images:['https://picsum.photos/seed/tucson-1/800/500','https://picsum.photos/seed/tucson-2/800/500','https://picsum.photos/seed/tucson-3/800/500'], make:'Hyundai', model:'Tucson', year:2020, mileage:41000, price:17800, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'هيونداي توسان SUV مريحة مع مساحة واسعة وتقنيات أمان.', tags:['SUV','مريحة','عائلية'] },
            { id: 'bmw-320i-2019', images:['https://picsum.photos/seed/bmw320i-1/800/500','https://picsum.photos/seed/bmw320i-2/800/500','https://picsum.photos/seed/bmw320i-3/800/500'], make:'BMW', model:'320i', year:2019, mileage:52000, price:22800, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'بي إم دبليو 320i قيادة ديناميكية مع فخامة ألمانية.', tags:['فاخرة','رياضية'] }
          ];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
        }
      }
    }catch(e){ console.error(e); cars = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); }
  }

  function saveCars(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(cars)); renderList(); }

  function toast(msg){
    // Inline status in form header
    if (els.formStatus) {
      els.formStatus.textContent = msg;
    }
    // Floating toast at corner
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.setAttribute('role','status');
      t.style.position = 'fixed';
      t.style.insetInlineEnd = '16px';
      t.style.insetBlockEnd = '16px';
      t.style.background = '#111827';
      t.style.color = '#fff';
      t.style.padding = '.55rem .8rem';
      t.style.borderRadius = '10px';
      t.style.boxShadow = '0 10px 24px rgba(0,0,0,.18)';
      t.style.zIndex = '9999';
      t.style.fontWeight = '700';
      t.style.fontSize = '.95rem';
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      t.style.transition = 'opacity .2s ease, transform .2s ease';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    // show
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateY(0)';
    });
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => {
      // hide
      t.style.opacity = '0';
      t.style.transform = 'translateY(8px)';
      if (els.formStatus) els.formStatus.textContent = '';
    }, 2000);
  }

  function newCar(){
    active = { id:'', images:[], make:'', model:'', year:new Date().getFullYear(), mileage:0, price:0, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'', tags:[] };
    fillForm(active);
  }

  function fillForm(c){
    els.make.value = c.make || '';
    els.model.value = c.model || '';
    els.year.value = c.year || '';
    els.price.value = c.price || '';
    els.mileage.value = c.mileage || '';
    els.seats.value = c.seats || '';
    els.transmission.value = c.transmission || 'أوتوماتيك';
    els.fuel.value = c.fuel || 'بنزين';
    els.images.value = (c.images||[]).join('\n');
    els.tags.value = (c.tags||[]).join(', ');
    els.description.value = c.description || '';
  }

  function readForm(){
    const images = els.images.value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    const tags = els.tags.value.split(',').map(s=>s.trim()).filter(Boolean);
    const make = els.make.value.trim();
    const model = els.model.value.trim();
    const year = Number(els.year.value);
    const price = Number(els.price.value);
    const mileage = Number(els.mileage.value);
    const seats = Number(els.seats.value);
    const transmission = els.transmission.value;
    const fuel = els.fuel.value;
    const description = els.description.value.trim();

    if(!make || !model || !year || !price){
      throw new Error('تأكد من تعبئة الشركة والطراز والسنة والسعر');
    }

    // بناء معرف تلقائي ثابت
    const id = slugify(`${make}-${model}-${year}`);

    return { id, images, make, model, year, mileage, price, transmission, fuel, seats, description, tags };
  }

  function slugify(s){
    return s
      .toLowerCase()
      .replace(/\s+/g,'-')
      .replace(/[^\u0600-\u06FF\w-]/g,'') // احتفاظ بحروف عربية/لاتينية وأرقام وشرطة
      .replace(/-+/g,'-');
  }

  // رفع الصور إلى Supabase Storage ثم تعبئة textarea بالروابط العامة
  async function uploadSelectedImages(files) {
    if (!USE_SUPABASE) { alert('يجب تفعيل Supabase لرفع الصور'); return; }

    let folder = '';
    try {
      const car = readForm(); // قد يرمي خطأ إذا الحقول الأساسية غير مكتملة
      folder = car.id;
    } catch {
      folder = slugify(`${els.make.value || 'car'}-${els.model.value || 'model'}-${els.year.value || new Date().getFullYear()}`);
    }

    const bucket = 'cars';
    const urls = [];
    for (const file of files) {
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
      if (error) { console.error(error); alert('فشل رفع صورة: ' + error.message); continue; }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    const current = els.images.value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
    els.images.value = [...current, ...urls].join('\n');
    toast('تم رفع الصور وإضافة الروابط');
  }

  async function upsertCar(car){
    const i = cars.findIndex(x=>x.id===car.id);
    if(i>=0) cars[i] = car; else cars.unshift(car);
    // مزامنة قاعدة البيانات
    if(USE_SUPABASE){
      const { error } = await supabase.from(TABLE).upsert([car], { onConflict:'id' });
      if (error) {
        console.error('Supabase upsert failed:', error);
        throw new Error(error.message || 'Supabase upsert failed');
      }
    }else{
      // محلي فقط
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      const j = list.findIndex(x=>x.id===car.id);
      if(j>=0) list[j]=car; else list.unshift(car);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  }

  async function deleteActive(){
    if(!active) return;
    const i = cars.findIndex(x=>x.id===active.id);
    if(i>=0){
      const id = active.id;
      cars.splice(i,1);
      if(USE_SUPABASE){
        try{ await supabase.from(TABLE).delete().eq('id', id); }catch(e){ console.error(e); }
      }else{
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
        const j = list.findIndex(x=>x.id===id);
        if(j>=0){ list.splice(j,1); localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
      }
      await saveCars();
      newCar();
    }
  }

  function renderList(){
    let list = cars.slice();
    const q = els.search.value.trim().toLowerCase();
    if(q){
      list = list.filter(c=>(`${c.make} ${c.model} ${c.year} ${c.tags.join(' ')}`.toLowerCase()).includes(q));
    }

    switch(els.sort.value){
      case 'price-asc': list.sort((a,b)=>a.price-b.price); break;
      case 'price-desc': list.sort((a,b)=>b.price-a.price); break;
      case 'year-desc': list.sort((a,b)=>b.year-a.year); break;
      case 'year-asc': list.sort((a,b)=>a.year-b.year); break;
      default: /* recent */ break;
    }

    els.count.textContent = list.length;
    els.list.innerHTML = list.map(itemHTML).join('');
  }

  function itemHTML(c){
    const title = `${c.year} ${c.make} ${c.model}`;
    const subtitle = `${Number(c.mileage).toLocaleString('en-US')} كم • ${c.transmission} • ${c.fuel}`;
    const price = priceJOD(c.price);
    const tag = c.tags?.[0] ? `<span class="badge">${c.tags[0]}</span>` : '';
    const thumb = (c.images && c.images[0]) ? `<img src="${c.images[0]}" alt="${title}" style="width:78px;height:52px;object-fit:cover;border-radius:8px;border:1px solid var(--border)"/>` : `<div style="width:78px;height:52px;border-radius:8px;border:1px dashed var(--border);display:grid;place-items:center;color:var(--muted)">لا صورة</div>`;
    return `
      <div class="list-item" data-id="${c.id}" tabindex="0" role="button" aria-label="${title}">
        <div style="display:flex;align-items:center;gap:.7rem">
          ${thumb}
          <div>
            <div style="font-weight:700;color:var(--heading)">${title}</div>
            <div style="font-size:.85rem;color:var(--muted)">${subtitle}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem">
          ${tag}
          <div style="font-weight:800">${price}</div>
        </div>
      </div>`;
  }

  function selectById(id){
    const c = cars.find(x=>x.id===id);
    if(!c) return;
    active = clone(c);
    fillForm(active);
  }

  // فتح السيارة مباشرة عند وجود hash في الرابط
  function openFromHash(){
    const id = location.hash ? location.hash.slice(1) : '';
    if(id){ selectById(id); }
  }

  // تصدير/استيراد
  function exportJSON(){
    const blob = new Blob([JSON.stringify(cars, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cars-export.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function importJSON(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(String(reader.result||'[]'));
        if(!Array.isArray(data)) throw new Error('صيغة غير صحيحة');
        // تحقق أساسي
        cars = data.map(normalizeCar).filter(Boolean);
        saveCars();
        toast('تم الاستيراد');
      }catch(e){ alert('فشل الاستيراد: '+e.message); }
    };
    reader.readAsText(file);
  }

  function normalizeCar(c){
    if(!c) return null;
    const id = c.id || slugify(`${c.make}-${c.model}-${c.year}`);
    const images = Array.isArray(c.images) ? c.images.filter(Boolean) : [];
    const tags = Array.isArray(c.tags) ? c.tags.filter(Boolean) : [];
    const year = Number(c.year)||new Date().getFullYear();
    const price = Number(c.price)||0;
    const mileage = Number(c.mileage)||0;
    const seats = Number(c.seats)||5;
    const transmission = c.transmission||'أوتوماتيك';
    const fuel = c.fuel||'بنزين';
    const description = c.description||'';
    return { id, images, make:c.make||'', model:c.model||'', year, mileage, price, transmission, fuel, seats, description, tags };
  }

  // حماية بسيطة
  function ensurePassword(){
    // خزّن كلمة المرور مرة واحدة
    if(!localStorage.getItem(PASS_KEY)){
      localStorage.setItem(PASS_KEY, DEFAULT_PASS);
    }
  }

  function showAuth(){ els.auth.style.display='grid'; }
  function hideAuth(){ els.auth.style.display='none'; }

  function checkAuth(){
    ensurePassword();
    // جلسة محفوظة؟
    const ok = sessionStorage.getItem(SESSION_KEY) === '1';
    if(ok){ hideAuth(); return; }

    showAuth();
    els.authSubmit.addEventListener('click', ()=>{
      const saved = localStorage.getItem(PASS_KEY);
      if(els.authPass.value === saved){ 
        hideAuth();
        sessionStorage.setItem(SESSION_KEY, '1');
      }
      else { els.authError.style.display='block'; }
    });
    // Enter key
    els.authPass.addEventListener('keydown', (e)=>{ if(e.key==='Enter') els.authSubmit.click(); });
  }

  // أحداث
  function bind(){
    els.btnNew.addEventListener('click', newCar);
    els.btnSaveAll.addEventListener('click', ()=>{ saveCars(); toast('تم الحفظ'); });
    els.btnDelete.addEventListener('click', ()=>{ if(confirm('تأكيد حذف السيارة الحالية؟')) deleteActive(); });
    els.btnResetForm.addEventListener('click', ()=>{ if(confirm('تفريغ الحقول؟')) newCar(); });

    els.form.addEventListener('submit', async e=>{
      e.preventDefault();
      try{
        const car = readForm();
        await upsertCar(car); // انتظر Supabase
        saveCars();           // ثم احفظ محليًا
        active = car;
        toast(USE_SUPABASE ? 'تم الحفظ: السحابة + محلي' : 'تم الحفظ محليًا');
      }catch(err){
        // لا نخسر التعديل المحلي
        saveCars();
        alert('فشل الحفظ إلى السحابة: ' + err.message);
      }
    });

    // منع أي إعادة تحميل بسبب أزرار بدون type
    document.querySelectorAll('button:not([type])').forEach(btn=>btn.setAttribute('type','button'));

    els.search.addEventListener('input', renderList);
    els.sort.addEventListener('change', renderList);
    els.resetFilters.addEventListener('click', ()=>{ els.search.value=''; els.sort.value='recent'; renderList(); });

    els.list.addEventListener('click', e=>{
      const item = e.target.closest('.list-item');
      if(item){ selectById(item.dataset.id); }
    });
    els.list.addEventListener('keydown', e=>{
      if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('list-item')){
        e.preventDefault(); selectById(e.target.dataset.id);
      }
    });

    els.btnExport.addEventListener('click', exportJSON);
    els.importFile.addEventListener('change', e=>{ const f=e.target.files?.[0]; if(f) importJSON(f); e.target.value=''; });

    // رفع الصور
    if (els.imageFiles) {
      els.imageFiles.addEventListener('change', e => {
        const files = Array.from(e.target.files || []);
        if (files.length) uploadSelectedImages(files);
        e.target.value = '';
      });
    }
  }

  // تهيئة
  document.addEventListener('DOMContentLoaded', async ()=>{
    checkAuth();
    await loadCars();
    bind();
    renderList();
    newCar();
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  });
})();