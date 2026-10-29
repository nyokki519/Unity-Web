import {
  bootClassic
} from './classic-view.js';
document.querySelector('#retry-classic').addEventListener('click', () => location.reload());
bootClassic().catch(error => {
  console.error(error);
  document.querySelector('#loading').hidden = true;
  document.querySelector('#load-error').hidden = false;
});
