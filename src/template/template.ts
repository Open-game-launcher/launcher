import './template.css';
import htmlTemplate from './template.html?raw';
import './components/button/button.ts';
import { BaseTemplate } from '../utils/BaseTemplate.ts';

export class Template extends BaseTemplate {
    get template() {
        return htmlTemplate;
    }
}
