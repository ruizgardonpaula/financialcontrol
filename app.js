const DEFAULT_CATEGORIES = [
  {id:'rent',name:'Alquiler',icon:'🏠',budget:600},
  {id:'utilities',name:'Luz + agua + gas',icon:'💡',budget:60},
  {id:'groceries',name:'Supermercado',icon:'🛒',budget:230},
  {id:'transport',name:'Transporte',icon:'🚇',budget:30},
  {id:'restaurants',name:'Restaurantes / delivery',icon:'🍽️',budget:60},
  {id:'coffee',name:'Cafés / meriendas',icon:'☕',budget:30},
  {id:'leisure',name:'Ocio',icon:'🎉',budget:60},
  {id:'clothes',name:'Ropa',icon:'👗',budget:20},
  {id:'cosmetics',name:'Cosmética',icon:'💄',budget:25},
  {id:'health',name:'Farmacia + imprevistos',icon:'💊',budget:40},
  {id:'gifts',name:'Regalos',icon:'🎁',budget:20},
];
const INCOME = 1920.11;
const DEFAULT_TARGET = 600;
let categories = load('categories', DEFAULT_CATEGORIES);
let expenses = load('expenses', []);
let savingsTarget = Number(localStorage.getItem('savingsTarget') || DEFAULT_TARGET);
let categoryChart, dailyChart;

const $ = id => document.getElementById(id);
const euro = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
const dateKey = d => new Date(d).toISOString().slice(0,10);
const currentMonth = () => new Date().toISOString().slice(0,7);
const monthExpenses = () => expenses.filter(e => e.date.startsWith(currentMonth()));
function load(key, fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}}
function save(){localStorage.setItem('categories',JSON.stringify(categories));localStorage.setItem('expenses',JSON.stringify(expenses));localStorage.setItem('savingsTarget',savingsTarget)}
function totalBudget(){return categories.reduce((s,c)=>s+Number(c.budget),0)}
function spentTotal(){return monthExpenses().reduce((s,e)=>s+Number(e.amount),0)}
function spentByCategory(id){return monthExpenses().filter(e=>e.category===id).reduce((s,e)=>s+Number(e.amount),0)}
function fmtDate(s){return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short'}).format(new Date(s+'T12:00:00'))}
function render(){
  const budget=totalBudget(), spent=spentTotal(), remaining=Math.max(0,budget-spent), estimatedSavings=INCOME-spent;
  $('monthLabel').textContent=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date()).replace(/^./,m=>m.toUpperCase());
  $('spentValue').textContent=euro(spent); $('spentPercent').textContent=`${budget?Math.round(spent/budget*100):0}% del presupuesto`;
  $('availableValue').textContent=euro(remaining); $('savingsValue').textContent=euro(estimatedSavings); $('savingsStatus').textContent=`Objetivo: ${euro(savingsTarget)}`;
  const savingsPct=Math.min(100,Math.max(0,(estimatedSavings/savingsTarget)*100));
  $('goalAmount').textContent=euro(estimatedSavings); $('goalMessage').textContent=estimatedSavings>=savingsTarget?`Vas ${euro(estimatedSavings-savingsTarget)} por encima de tu objetivo mínimo.`:`Te faltan ${euro(savingsTarget-estimatedSavings)} para alcanzar tu objetivo.`;
  $('goalTitle').textContent=estimatedSavings>=savingsTarget?'Objetivo de ahorro en camino':'Hay que controlar el gasto';
  $('goalProgress').style.width=`${savingsPct}%`; $('goalProgress').className='goal-progress '+(estimatedSavings<savingsTarget*.75?'danger':estimatedSavings<savingsTarget?'warning':'');
  $('goalRight').textContent=estimatedSavings>=savingsTarget?`${euro(estimatedSavings-savingsTarget)} por encima`: `${euro(savingsTarget-estimatedSavings)} por conseguir`;
  renderCategories(); renderExpenses(); renderCharts();
}
function renderCategories(){
  $('categoryList').innerHTML=categories.map(c=>{const spent=spentByCategory(c.id), pct=c.budget?Math.min(100,spent/c.budget*100):100, left=c.budget-spent;return `<div class="category-row"><div class="cat-icon">${c.icon}</div><div class="cat-main"><div class="cat-top"><span class="cat-name">${c.name}</span><span class="cat-amount">${euro(spent)} / ${euro(c.budget)}</span></div><div class="bar"><div class="bar-fill ${spent>c.budget?'over':''}" style="width:${pct}%"></div></div></div><div class="remaining"><strong>${left>=0?euro(left):`+${euro(Math.abs(left))}`}</strong><span>${left>=0?'restantes':'exceso'}</span></div></div>`}).join('');
}
function renderExpenses(){
  const list=[...monthExpenses()].sort((a,b)=>b.date.localeCompare(a.date)||b.created-b.created);
  $('expenseList').innerHTML=list.length?list.map(e=>{const c=categories.find(x=>x.id===e.category);return `<div class="expense-item"><div class="expense-icon">${c?.icon||'💶'}</div><div class="expense-info"><strong>${e.note||c?.name||'Gasto'}</strong><span>${c?.name||''} · ${fmtDate(e.date)}</span></div><span class="expense-value">−${euro(e.amount)}</span><button class="delete-expense" data-id="${e.id}" title="Eliminar">×</button></div>`}).join(''):`<div class="empty">Todavía no hay gastos este mes.<br>Añade el primero para empezar.</div>`;
  document.querySelectorAll('.delete-expense').forEach(b=>b.onclick=()=>{expenses=expenses.filter(e=>e.id!==b.dataset.id);save();render()});
}
function renderCharts(){
  if(typeof Chart==='undefined') return;
  const labels=categories.map(c=>c.name), values=categories.map(c=>spentByCategory(c.id));
  if(categoryChart) categoryChart.destroy();
  categoryChart=new Chart($('categoryChart'),{type:'bar',data:{labels,datasets:[{label:'Gastado',data:values,borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{callback:v=>v+' €'}},y:{grid:{display:false}}}}});
  const days=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const daily=Array.from({length:days},(_,i)=>({day:i+1,total:0})); monthExpenses().forEach(e=>{const d=new Date(e.date+'T12:00:00').getDate();daily[d-1].total+=Number(e.amount)});
  let running=0; const cumulative=daily.map(x=>{running+=x.total;return Number(running.toFixed(2))});
  if(dailyChart) dailyChart.destroy();
  dailyChart=new Chart($('dailyChart'),{type:'line',data:{labels:daily.map(x=>x.day),datasets:[{label:'Gasto acumulado',data:cumulative,tension:.35,fill:true}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},title:{display:true,text:'Día del mes'}},y:{beginAtZero:true,ticks:{callback:v=>v+' €'}}}}});
}
function openExpense(){
  $('expenseCategory').innerHTML=categories.map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join(''); $('expenseDate').value=dateKey(new Date()); $('expenseAmount').value=''; $('expenseNote').value=''; $('expenseDialog').showModal(); setTimeout(()=>$('expenseAmount').focus(),50);
}
function openBudget(){
  $('budgetInputs').innerHTML=categories.map(c=>`<span>${c.icon} ${c.name}</span><input data-budget-id="${c.id}" type="number" min="0" step="5" value="${c.budget}">`).join(''); $('savingsTarget').value=savingsTarget; $('budgetDialog').showModal();
}
$('addExpenseTop').onclick=openExpense; $('closeExpense').onclick=()=>$('expenseDialog').close(); $('editBudgetBtn').onclick=openBudget; $('closeBudget').onclick=()=>$('budgetDialog').close();
$('expenseForm').onsubmit=e=>{e.preventDefault();const amount=Number($('expenseAmount').value);if(!amount||amount<=0)return;expenses.push({id:crypto.randomUUID(),category:$('expenseCategory').value,amount,date:$('expenseDate').value,note:$('expenseNote').value.trim(),created:Date.now()});save();$('expenseDialog').close();render()};
$('budgetForm').onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-budget-id]').forEach(i=>{const c=categories.find(x=>x.id===i.dataset.budgetId);c.budget=Math.max(0,Number(i.value)||0)});savingsTarget=Math.max(0,Number($('savingsTarget').value)||0);save();$('budgetDialog').close();render()};
$('clearMonthBtn').onclick=()=>{if(confirm('¿Borrar todos los gastos de este mes?')){const m=currentMonth();expenses=expenses.filter(e=>!e.date.startsWith(m));save();render()}};
$('themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('dark',document.body.classList.contains('dark'));$('themeToggle').textContent=document.body.classList.contains('dark')?'☀':'☾'};
if(localStorage.getItem('dark')==='true'){document.body.classList.add('dark');$('themeToggle').textContent='☀'}
render();
