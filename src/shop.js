import { PART_NAMES, SPECIALS, THRESHOLDS, partPrice, levelOf, coinText } from './garage.js';
import { paintIcon } from './part-art.js';

export function createShop(root, wallet, buy) {
  const balance=[8,9].map(id=>{
    const holder=document.createElement('span'), icon=document.createElement('i'), amount=document.createElement('b');
    icon.className='part-icon';paintIcon(icon,id);holder.append(icon,amount);wallet.append(holder);return amount;
  });
  const offers=[...PART_NAMES.map((name,i)=>({name,part:i})),...SPECIALS].map((item,i)=>{
    const kit=i>=PART_NAMES.length, index=kit ? i-PART_NAMES.length : i;
    const button=document.createElement('button'), icon=document.createElement('i'), copy=document.createElement('span');
    const title=document.createElement('b'), detail=document.createElement('small');
    title.textContent=item.name;icon.className='part-icon';copy.append(title,detail);button.append(icon,copy);
    button.type='button';root.append(button);
    button.addEventListener('click',()=>buy(kit?'kit':'part',index,Number(button.dataset.level)));
    return (garage,levels)=>{
      const level=levels[item.part], price=kit? item.price : partPrice(level);
      const done=kit ? garage.kits[index] : level===THRESHOLDS.length;
      paintIcon(icon,item.part,kit ? 8 : Math.min(8,level+1));button.dataset.level=level;
      const suffix=kit ? item.effect : 'Ур. '+level+' → '+(level+1);
      detail.textContent=done ? (kit ? 'Установлен · '+item.effect : 'Максимальный уровень') : suffix+' · '+(kit?price+' алм.':coinText(price));
      button.disabled=done || (kit ? garage.gems : garage.coins)<price;
    };
  });
  return garage=>{
    const levels=garage.points.map(levelOf);
    balance[0].textContent=coinText(garage.coins);balance[1].textContent=garage.gems+' алм.';
    offers.forEach(update=>update(garage,levels));
  };
}
