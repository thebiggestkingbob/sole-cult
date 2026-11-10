export type Sneaker={id:string;name:string;color:string;price:number;image:string;sizes:string[]};
const sizes=['36','37','38','39','40','41','42','43','44','45.5'];
export const products:Sneaker[]=[
{id:'air-force',name:"NIKE AIR FORCE 1 '07",color:'Beige Suede / White',price:1700,image:'/shoes/air-force.png',sizes},
{id:'9060',name:'NEW BALANCE 9060',color:'Baby Blue / Cream',price:1730,image:'/shoes/9060.png',sizes},
{id:'p6000',name:'NIKE P-6000',color:'Metallic Silver / Brown',price:1500,image:'/shoes/p6000.png',sizes},
{id:'dunk',name:'NIKE DUNK LOW',color:'Brown / Sail',price:1580,image:'/shoes/dunk.png',sizes},
{id:'vomero',name:'NIKE AIR ZOOM VOMERO 5',color:'White / Silver',price:1700,image:'/shoes/vomero.png',sizes},
{id:'samba',name:'ADIDAS SAMBA',color:'White / Black / Gum',price:1600,image:'/shoes/samba.png',sizes},
{id:'mule',name:'ADIDAS SUEDE MULE',color:'Beige Suede',price:1510,image:'/shoes/mule.png',sizes},
];
export const zar=(value:number)=>'R'+value.toLocaleString('en-ZA');
