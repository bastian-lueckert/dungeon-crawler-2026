import './style.css';
import { App } from './app';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const root = document.querySelector<HTMLDivElement>('#app')!;
new App(root);
