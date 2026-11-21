import { PART_NAMES, THRESHOLDS, levelOf, buildSpec, SPECIALS } from './garage.js';

import { metricHP } from './vehicle-constants.js';
import { paintIcon } from './part-art.js';

export const finishes = ['Ржавчина', 'Грунт', 'Эмаль', 'Два тона', 'Утиный хвост', 'Спорт', 'Двойное крыло', 'Гоночный обвес'];

export function createGaragePanel(left, right, title) {
  const cards = PART_NAMES.map((name,i) => {
    const card = document.createElement('div');
    card.className = 'part-card';
    card.innerHTML = '<i class="part-icon" aria-hidden="true"></i><div class="part-info"><div><b></b><strong></strong></div><small></small><progress></progress></div>';
    card.querySelector('i').dataset.part = i;
    card.querySelector('b').textContent = name;
    card.querySelector('progress').setAttribute('aria-label', name);
    (i < 4 ? left : right).append(card);
    return card;
  });
  return function draw(garage, changes) {
    const levels = garage.points.map(levelOf);
    const spec = buildSpec(levels,garage.kits);
    const ratings = {
      power:metricHP(spec.powerKW).toLocaleString('ru-RU',{maximumFractionDigits:1}),
      force:Math.round(spec.driveForce).toLocaleString('ru-RU'),
      speed:Math.round(spec.topSpeed*3.6).toString(),
      grip:spec.friction.toFixed(2).replace('.',','),
      brake:spec.brakeTorque.toLocaleString('ru-RU'),
      nitro:spec.boostDuration.toFixed(1).replace('.',',')
    };
    for(const [id,value] of Object.entries(ratings)){
      const field=document.getElementById('stat-'+id), previous=field.textContent;
      field.parentElement.querySelector('.was').textContent=
        changes && previous!==value ? 'было '+previous : '';
      field.textContent=value;
    }
    const specs = [ratings.power+' л.с. при '+spec.ratedRPM+' об/мин', 'до '+(spec.topSpeed*3.6).toFixed(0)+' км/ч',
      'Ø '+Math.round(spec.tireRadius*200)+' см · μ '+spec.friction.toFixed(2), (spec.damperLimit/1000).toFixed(2)+' кН',
      spec.brakeTorque+' Н·м', finishes[levels[5]-1],
      spec.smokeFactor.toFixed(2)+'× копоть', spec.boostDuration.toFixed(1)+' с форсажа'];
    title.textContent = 'Сборка ' + levels.reduce((a,b)=>a+b,0) + ' / 64';
    cards.forEach((card,i) => {
      const lv = levels[i];
      paintIcon(card.querySelector('i'),i,lv);
      card.querySelector('strong').textContent = 'Ур. '+lv;
      const pendingKit=SPECIALS.some((item,k)=>item.part===i && garage.kitOrders[k]);
      const order=garage.orders[i] ? ' · заказ до ур. '+Math.min(8,lv+2) : '';
      card.querySelector('small').textContent=specs[i]+order+(pendingKit?' · заказан комплект':'');
      const bar = card.querySelector('progress');
      bar.max=THRESHOLDS.length;
      bar.value=lv;
      if (!changes?.[i].gain) return;
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      card.querySelector('i').animate([
        {transform:'translateY(-5px) rotate(-6deg)'},
        {transform:'translateY(1px) rotate(1deg)',offset:.72},
        {transform:'none'}
      ],{duration:240,easing:'ease-out'});
    });
  };
}
