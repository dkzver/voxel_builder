(() => {
  "use strict";
  const cards=[...document.querySelectorAll(".item-card")];
  const tabs=[...document.querySelectorAll(".tab")];
  const search=document.querySelector("#item-search");
  const grid=document.querySelector("#item-grid");
  const empty=document.querySelector("#empty-state");
  let filter="all",selected=cards[0];
  const symbols={resource:"Fe",equipment:"EQ",parts:"PT"};
  function selectCard(card){
    if(!card)return;
    selected=card;cards.forEach(c=>c.classList.toggle("selected",c===card));
    const category=card.dataset.category;
    document.querySelector("#detail-category").textContent=card.querySelector(".item-type").textContent;
    document.querySelector("#detail-name").textContent=card.dataset.name;
    document.querySelector("#detail-description").textContent=card.dataset.description;
    document.querySelector("#detail-amount").textContent=card.dataset.amount;
    document.querySelector("#detail-code").textContent=card.dataset.code;
    document.querySelector("#detail-art .detail-symbol").textContent=symbols[category]||"—";
  }
  function render(){
    const q=search.value.trim().toLocaleLowerCase("ru");
    let visible=0;
    cards.forEach(card=>{
      const matchCategory=filter==="all"||card.dataset.category===filter;
      const matchSearch=(card.dataset.name+" "+card.dataset.code+" "+card.textContent).toLocaleLowerCase("ru").includes(q);
      const show=matchCategory&&matchSearch;
      card.classList.toggle("hidden",!show);if(show)visible++;
    });
    document.querySelector("#visible-count").textContent=String(visible).padStart(2,"0");
    empty.classList.toggle("hidden",visible!==0);grid.classList.toggle("hidden",visible===0);
    if(selected.classList.contains("hidden"))selectCard(cards.find(c=>!c.classList.contains("hidden")));
  }
  tabs.forEach(tab=>tab.addEventListener("click",()=>{
    filter=tab.dataset.filter;
    tabs.forEach(t=>{const active=t===tab;t.classList.toggle("active",active);t.setAttribute("aria-selected",String(active));});
    render();
  }));
  cards.forEach(card=>card.addEventListener("click",()=>selectCard(card)));
  search.addEventListener("input",render);
})();