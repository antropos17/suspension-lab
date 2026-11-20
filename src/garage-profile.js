import { readGarage } from './garage.js';
import { FINISH } from './vehicle-constants.js';

export function createGarageProfile(testMode, getStorage=()=>testMode ? sessionStorage : localStorage) {
  const key=testMode ? 'suspension-lab.test.v1' : 'suspension-lab.garage.v3';
  const distanceKey=testMode ? key+'.distance' : 'suspension-lab.garage.v1.distance';
  return {
    key,
    load(fallback){
      try{
        const storage=getStorage();
        let raw=storage.getItem(key);
        if(raw===null && !testMode) raw=storage.getItem('suspension-lab.garage.v2') ?? storage.getItem('suspension-lab.garage.v1');
        return readGarage(raw);
      }catch{return fallback ?? readGarage(null);}
    },
    save(garage){getStorage().setItem(key,JSON.stringify(garage));},
    peak(){
      try{
        const meters=Number(getStorage().getItem(distanceKey));
        return Number.isInteger(meters) && meters>=0 && meters<=FINISH ? meters : 0;
      }catch{return 0;}
    },
    savePeak(meters){
      try{if(meters>this.peak())getStorage().setItem(distanceKey,String(meters));}catch{}
    },
    clearTestPeak(){
      if(testMode)try{getStorage().removeItem(distanceKey);}catch{}
    }
  };
}
