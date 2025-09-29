// بيانات السيارات (تقرأ من Supabase أو LocalStorage إن وجد، وإلا لا توجد سيارات افتراضية)
const STORAGE_KEY = 'showroom.cars.v1';
const DEFAULT_CARS = [];

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
  renderFeatured();
})();

const priceJOD = n => `JOD ${Number(n).toLocaleString('en-US')}`;
const featGrid = document.getElementById('featGrid');

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

function renderFeatured(){
  if(featGrid) featGrid.innerHTML = cars.map(cardHTML).join('');
}

// وظائف المودال
const els = { modal: document.getElementById('modal'), closeModal: document.getElementById('closeModal'), carouselImg: document.getElementById('carouselImg'), prevSlide: document.getElementById('prevSlide'), nextSlide: document.getElementById('nextSlide'), modalTitle: document.getElementById('modalTitle'), modalDesc: document.getElementById('modalDesc'), modalStatus: document.getElementById('modalStatus') };
let activeCar = null, slideIndex = 0, lastFocused = null;

function openModalById(id){
  const car = cars.find(x=>x.id===id); if(!car) return;
  activeCar = car; slideIndex = 0; els.modalTitle.textContent = `${car.make} ${car.model} ${car.year}`; els.modalDesc.innerHTML = specsHTML(car); updateSlide(); els.modal.setAttribute('open',''); els.modalStatus.textContent=''; lastFocused = document.activeElement; els.closeModal.focus();
}

function close(){ els.modal.removeAttribute('open'); if(lastFocused && lastFocused.focus) lastFocused.focus(); }
function updateSlide(){ if(!activeCar) return; const t = activeCar.images.length; const s = ((slideIndex%t)+t)%t; els.carouselImg.src = activeCar.images[s]; els.carouselImg.alt = `${activeCar.make} ${activeCar.model} — صورة ${s+1} من ${t}`; }
function specsHTML(c){
  const rows = [ ['السعر', priceJOD(c.price)], ['الموديل', `${c.year}`], ['المشَى', `${c.mileage.toLocaleString('en-US')} كم`], ['ناقل الحركة', c.transmission], ['الوقود', c.fuel], ['عدد المقاعد', `${c.seats}`] ]
    .map(([k,v])=>`<div class="row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  const tagList = c.tags.map(t=>`<span class="chip">${t}</span>`).join('');
  return `<div style="grid-column:1/-1"><p style="margin:.2rem 0;color:var(--muted)">${c.description}</p></div>${rows}<div class="row" style="grid-column:1/-1;justify-content:flex-start;gap:.35rem;flex-wrap:wrap"><span style="font-weight:700;color:var(--heading)">التصنيفات:</span>${tagList}</div>`;
}

function bind(){
  featGrid.addEventListener('click', e=>{ const card = e.target.closest('.card'); if(card?.dataset.id) openModalById(card.dataset.id); });
  featGrid.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ') && e.target.classList.contains('card')){ e.preventDefault(); openModalById(e.target.dataset.id); } });
  els.closeModal.addEventListener('click', close);
  els.modal.addEventListener('click', e=>{ if(e.target===els.modal) close(); });
  document.addEventListener('keydown', e=>{ if(!els.modal.hasAttribute('open')) return; if(e.key==='Escape') close(); if(e.key==='ArrowLeft'){ slideIndex--; updateSlide(); } if(e.key==='ArrowRight'){ slideIndex++; updateSlide(); } if(e.key==='Tab'){ const f=els.modal.querySelectorAll('button,[href],input,textarea,[tabindex]:not([tabindex="-1"])'); if(!f.length) return; const first=f[0], last=f[f.length-1]; if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } });
  document.getElementById('prevSlide').addEventListener('click', ()=>{ slideIndex--; updateSlide(); });
  document.getElementById('nextSlide').addEventListener('click', ()=>{ slideIndex++; updateSlide(); });
}

// سنة الفوتر
document.addEventListener('DOMContentLoaded', ()=>{
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  bind();
});