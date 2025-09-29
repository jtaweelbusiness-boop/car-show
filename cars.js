// بيانات السيارات (تقرأ من Supabase أو LocalStorage إن وجد، وإلا تستخدم افتراضي موسّع)
const STORAGE_KEY = 'showroom.cars.v1';
const DEFAULT_CARS = [
  { id: 'toyota-corolla-2021', images:['https://picsum.photos/seed/corolla-1/800/500','https://picsum.photos/seed/corolla-2/800/500','https://picsum.photos/seed/corolla-3/800/500'], make:'Toyota', model:'Corolla', year:2021, mileage:32000, price:14500, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'تويوتا كورولا بحالة ممتازة، صيانة دورية وكفاءة عالية في الاستهلاك.', tags:['اقتصادية','مضمونة','صيانة دورية'] },
  { id: 'hyundai-tucson-2020', images:['https://picsum.photos/seed/tucson-1/800/500','https://picsum.photos/seed/tucson-2/800/500','https://picsum.photos/seed/tucson-3/800/500'], make:'Hyundai', model:'Tucson', year:2020, mileage:41000, price:17800, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'هيونداي توسان SUV مريحة مع مساحة واسعة وتقنيات أمان.', tags:['SUV','مريحة','عائلية'] },
  { id: 'bmw-320i-2019', images:['https://picsum.photos/seed/bmw320i-1/800/500','https://picsum.photos/seed/bmw320i-2/800/500','https://picsum.photos/seed/bmw320i-3/800/500'], make:'BMW', model:'320i', year:2019, mileage:52000, price:22800, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'بي إم دبليو 320i قيادة ديناميكية مع فخامة ألمانية.', tags:['فاخرة','رياضية'] },
  { id: 'kia-sportage-2022', images:['https://picsum.photos/seed/sportage-1/800/500','https://picsum.photos/seed/sportage-2/800/500'], make:'Kia', model:'Sportage', year:2022, mileage:18000, price:23900, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'كيا سبورتاج بتقنيات حديثة وكفاءة ممتازة.', tags:['حديثة','مواصفات كاملة'] },
  { id: 'audi-a4-2018', images:['https://picsum.photos/seed/audia4-1/800/500','https://picsum.photos/seed/audia4-2/800/500','https://picsum.photos/seed/audia4-3/800/500'], make:'Audi', model:'A4', year:2018, mileage:69000, price:19500, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'أودي A4 أناقة وأداء متوازن.', tags:['فاخرة','مقصورة مميزة'] },
  { id: 'nissan-patrol-2021', images:['https://picsum.photos/seed/patrol-1/800/500','https://picsum.photos/seed/patrol-2/800/500'], make:'Nissan', model:'Patrol', year:2021, mileage:35000, price:43500, transmission:'أوتوماتيك', fuel:'بنزين', seats:7, description:'نيسان باترول قوة على الطرق الوعرة وراحة للعائلة.', tags:['دفع رباعي','قوي','عائلي'] },
  { id: 'tesla-model3-2022', images:['https://picsum.photos/seed/tesla3-1/800/500','https://picsum.photos/seed/tesla3-2/800/500','https://picsum.photos/seed/tesla3-3/800/500'], make:'Tesla', model:'Model 3', year:2022, mileage:12000, price:38900, transmission:'أوتوماتيك', fuel:'كهرباء', seats:5, description:'تسلا موديل 3 قيادة كهربائية ذكية مع تسارع مميز.', tags:['كهربائية','ذكية'] },
  { id: 'jeep-wrangler-2017', images:['https://picsum.photos/seed/wrangler-1/800/500','https://picsum.photos/seed/wrangler-2/800/500'], make:'Jeep', model:'Wrangler', year:2017, mileage:88000, price:21500, transmission:'عادي', fuel:'بنزين', seats:5, description:'جيب رانجلر لطرق المغامرات والأوف رود.', tags:['أوف رود','مغامرة'] },
  { id: 'mercedes-c200-2020', images:['https://picsum.photos/seed/c200-1/800/500','https://picsum.photos/seed/c200-2/800/500','https://picsum.photos/seed/c200-3/800/500'], make:'Mercedes-Benz', model:'C200', year:2020, mileage:27000, price:31200, transmission:'أوتوماتيك', fuel:'بنزين', seats:5, description:'مرسيدس C200 رفاهية وأداء ألماني راقٍ.', tags:['فخامة','راحة'] }
];

// === Supabase ===
const hasSupabaseConfig = typeof window.SUPABASE_URL === 'string' && typeof window.SUPABASE_ANON_KEY === 'string';
let supabase = null;
if (hasSupabaseConfig && window.supabase) {
  window.__sbClient = window.__sbClient || window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        storageKey: 'cars-site-auth',
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );
  supabase = window.__sbClient;
}
const USE_SUPABASE = !!supabase;
const TABLE = 'cars';

// أدوات مساعدة
const normalizeCar = (c) => {
  if (!c || typeof c !== 'object') return null;
  return {
    id: c.id || `${c.make || 'unknown'}-${c.model || 'unknown'}-${c.year || '0000'}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    images: Array.isArray(c.images) ? c.images.filter(i => typeof i === 'string') : [],
    make: c.make || 'غير محدد',
    model: c.model || 'غير محدد',
    year: Number(c.year) || 0,
    mileage: Number(c.mileage) || 0,
    price: Number(c.price) || 0,
    transmission: c.transmission || 'غير محدد',
    fuel: c.fuel || 'غير محدد',
    seats: Number(c.seats) || 0,
    description: c.description || '',
    tags: Array.isArray(c.tags) ? c.tags.filter(t => typeof t === 'string') : []
  };
};

async function loadCars(){
  if(USE_SUPABASE){
    try{
      const tryFetch = async (orderCol)=>{
        let q = supabase.from(TABLE).select('*');
        if(orderCol){ q = q.order(orderCol, { ascending:false }); }
        return await q;
      };
      let res = await tryFetch('created_at');
      if(res.error && res.error.code === '42703'){ res = await tryFetch('inserted_at'); }
      if(res.error && res.error.code === '42703'){ res = await tryFetch(null); }
      if(res.error) throw res.error;

      const arr = (res.data||[]).map(normalizeCar).filter(Boolean);
      // خزن نسخة محلية كاحتياط
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      return arr;
    }catch(e){
      console.warn('فشل تحميل من Supabase، استخدام LocalStorage:', e);
      // fallback to localStorage
    }
  }
  // LocalStorage fallback
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return DEFAULT_CARS;
    const arr = JSON.parse(raw);
    if(Array.isArray(arr) && arr.length) return arr.map(normalizeCar).filter(Boolean);
    return DEFAULT_CARS;
  }catch(e){ return DEFAULT_CARS; }
}

let cars = [];
(async () => {
  cars = await loadCars();
  filteredCars = [...cars];
  renderGrid();
  updateFilterResults();
})();

// إعدادات الإدارة
const PASS_KEY = 'showroom.admin.pass.v1';
const SESSION_KEY = 'showroom.admin.session.v1';
const DEFAULT_PASS = 'admin123';
function ensurePassword(){ if(!localStorage.getItem(PASS_KEY)){ localStorage.setItem(PASS_KEY, DEFAULT_PASS); } }
function isAdmin(){ return sessionStorage.getItem(SESSION_KEY) === '1'; }
async function ensureAdmin(){ if(isAdmin()) return true; ensurePassword(); const input = prompt('أدخل كلمة المرور لإجراء التعديل/الحذف'); if(input===null) return false; const saved = localStorage.getItem(PASS_KEY); if(input===saved){ sessionStorage.setItem(SESSION_KEY, '1'); return true; } alert('كلمة المرور غير صحيحة'); return false; }

const priceJOD = n => `JOD ${Number(n).toLocaleString('en-US')}`;
const els = { grid: document.getElementById('grid'), modal: document.getElementById('modal'), closeModal: document.getElementById('closeModal'), carouselImg: document.getElementById('carouselImg'), prevSlide: document.getElementById('prevSlide'), nextSlide: document.getElementById('nextSlide'), modalTitle: document.getElementById('modalTitle'), modalDesc: document.getElementById('modalDesc'), modalStatus: document.getElementById('modalStatus'), year: document.getElementById('year') };

// عناصر الفلاتر
const priceSlider = document.getElementById('priceSlider');
const yearFilter = document.getElementById('yearFilter');
const searchInput = document.getElementById('searchInput');
const resetFilters = document.getElementById('resetFilters');
const filterResults = document.getElementById('filterResults');

let activeCar = null, slideIndex = 0, lastFocused = null;
let filteredCars = [...cars]; // نسخة مصفاة من السيارات

function cardHTML(c){
  const tags = c.tags.map(t=>`<span class="chip">${t}</span>`).join('');
  return `
    <article class="card" role="button" tabindex="0" aria-label="${c.make} ${c.model} ${c.year}" data-id="${c.id}">
      <div class="media"><img src="${c.images[0]}" alt="${c.make} ${c.model}" loading="lazy" decoding="async" sizes="(max-width:640px) 100vw, (max-width:960px) 50vw, 33vw" /></div>
      <div class="body">
        <div class="title-row"><h3 style="margin:0;font-size:1.05rem;color:var(--heading);">${c.year} ${c.make} ${c.model}</h3><div class="price">${priceJOD(c.price)}</div></div>
        <div style="color:var(--muted);font-size:.92rem">${c.mileage.toLocaleString('en-US')} كم • ${c.transmission} • ${c.fuel}</div>
        <div class="tags">${tags}</div>
      </div>
    </article>`;
}
function render(){ els.grid.innerHTML = filteredCars.map(cardHTML).join(''); }

function openModalById(id){
  const car = cars.find(x=>x.id===id); if(!car) return;
  activeCar = car; slideIndex = 0; els.modalTitle.textContent = `${car.make} ${car.model} ${car.year}`; els.modalDesc.innerHTML = specsHTML(car); updateSlide(); els.modal.setAttribute('open',''); els.modalStatus.textContent=''; lastFocused = document.activeElement; els.closeModal.focus();
  // ربط أزرار الإدارة داخل المودال
  const btnEdit = document.getElementById('btnEditCar');
  const btnDelete = document.getElementById('btnDeleteCar');
  if(btnEdit){ btnEdit.addEventListener('click', async ()=>{
    if(!(await ensureAdmin())) return;
    // فتح صفحة الإدارة مع تمرير id عبر hash
    window.location.href = `admin.html#${car.id}`;
  }); }
  if(btnDelete){ btnDelete.addEventListener('click', async ()=>{
    if(!(await ensureAdmin())) return;
    if(!confirm('تأكيد حذف هذه السيارة؟')) return;
    // حذف من المصفوفة والتخزين
    const STORAGE_KEY = 'showroom.cars.v1';
    cars = cars.filter(x=>x.id!==car.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
    filteredCars = filteredCars.filter(x=>x.id!==car.id);
    render();
    close();
    alert('تم حذف السيارة');
  }); }
}
function close(){ els.modal.removeAttribute('open'); if(lastFocused && lastFocused.focus) lastFocused.focus(); }
function updateSlide(){ if(!activeCar) return; const t = activeCar.images.length; const s = ((slideIndex%t)+t)%t; els.carouselImg.src = activeCar.images[s]; els.carouselImg.alt = `${activeCar.make} ${activeCar.model} — صورة ${s+1} من ${t}`; }
function specsHTML(c){
  const rows = [
    ['السعر', priceJOD(c.price)],
    ['الموديل', `${c.year}`],
    ['المشَى', `${c.mileage.toLocaleString('en-US')} كم`],
    ['القير', c.transmission],
    ['الوقود', c.fuel],
    ['المقاعد', `${c.seats}`]
  ].map(([k,v])=>`<div class="row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  const desc = `<div style="grid-column:1/-1"><p style="margin:.2rem 0;color:var(--muted);font-size:.92rem">${c.description}</p></div>`;
  return `${desc}${rows}`;
}

// وظائف الفلترة
function applyFilters() {
  const maxPrice = parseInt(priceSlider.value);
  const yearValue = yearFilter.value;
  const searchQuery = searchInput.value;

  filteredCars = cars.filter(car => {
    // فلتر السعر (أقل من أو يساوي القيمة المحددة)
    let priceMatch = car.price <= maxPrice;

    // فلتر الموديل
    let yearMatch = true;
    if (yearValue) {
      yearMatch = car.year == yearValue;
    }

    // البحث
    let searchMatch = true;
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      const searchableText = `${car.make} ${car.model} ${car.year} ${car.tags.join(' ')} ${car.fuel} ${car.transmission}`.toLowerCase();
      searchMatch = searchableText.includes(searchTerm);
    }

    return priceMatch && yearMatch && searchMatch;
  });

  // تحديث رسالة النتائج
  updateFilterResults();
  render();
}

function updateFilterResults() {
  if (filteredCars.length === 0) {
    filterResults.textContent = 'لم يتم العثور على سيارات تطابق الفلاتر المحددة';
    filterResults.style.color = 'var(--accent)';
  } else if (filteredCars.length === 1) {
    filterResults.textContent = `تم العثور على ${filteredCars.length} سيارة`;
    filterResults.style.color = 'var(--muted)';
  } else {
    filterResults.textContent = `تم العثور على ${filteredCars.length} سيارات`;
    filterResults.style.color = 'var(--muted)';
  }
}

function resetAllFilters() {
  priceSlider.value = '70000';
  document.getElementById('priceValue').textContent = '70,000 دينار';
  yearFilter.value = '';
  searchInput.value = '';
  filteredCars = [...cars];
  filterResults.textContent = '';
  render();
}

// وظيفة البحث القديمة (للتوافق)
function searchCars(query) {
  searchInput.value = query;
  applyFilters();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function bind(){
  // تطبيق الفلاتر عند التغيير
  priceSlider.addEventListener('input', e => { updateSliderUI(); applyFilters(); });
  yearFilter.addEventListener('change', applyFilters);

  // البحث مع debounce
  const debouncedSearch = debounce(applyFilters, 300);
  searchInput.addEventListener('input', debouncedSearch);

  // البحث عند الضغط على Enter
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyFilters();
    }
  });

  // زر إعادة تعيين الفلاتر
  resetFilters.addEventListener('click', resetAllFilters);

  els.grid.addEventListener('click', e=>{ const card = e.target.closest('.card'); if(card?.dataset.id) openModalById(card.dataset.id); });
  els.grid.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('card')){ e.preventDefault(); openModalById(e.target.dataset.id); } });
  els.closeModal.addEventListener('click', close);
  els.modal.addEventListener('click', e=>{ if(e.target===els.modal) close(); });
  document.addEventListener('keydown', e=>{ if(!els.modal.hasAttribute('open')) return; if(e.key==='Escape') close(); if(e.key==='ArrowLeft'){ slideIndex--; updateSlide(); } if(e.key==='ArrowRight'){ slideIndex++; updateSlide(); } if(e.key==='Tab'){ const f=els.modal.querySelectorAll('button,[href],input,textarea,[tabindex]:not([tabindex="-1"])'); if(!f.length) return; const first=f[0], last=f[f.length-1]; if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } });
  document.getElementById('prevSlide').addEventListener('click', ()=>{ slideIndex--; updateSlide(); });
  document.getElementById('nextSlide').addEventListener('click', ()=>{ slideIndex++; updateSlide(); });
}

// تحديث واجهة الـ slider (اللون وفقاعة السعر)
function updateSliderUI() {
  const slider = document.getElementById('priceSlider');
  if (!slider) return;
  const percent = (slider.value / slider.max) * 100;
  slider.style.setProperty('--slider-percent', percent + '%');
  const priceValueEl = document.getElementById('priceValue');
  if (priceValueEl) {
    priceValueEl.textContent = Number(slider.value).toLocaleString('en-US') + ' دينار';
  }
}

// تطبيق التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', ()=>{
  render();
  bind();
  updateSliderUI();
  const y=document.getElementById('year');
  if(y) y.textContent=new Date().getFullYear();
});