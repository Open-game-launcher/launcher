import { Template } from './template/template.ts';

const instance = new Template();
document.body.innerHTML = instance.template;
instance.init();
