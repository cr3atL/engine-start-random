import {defineConfig} from 'vite';

const repository=process.env.GITHUB_REPOSITORY?.split('/')[1];
const pagesBase=repository&&!repository.endsWith('.github.io')?`/${repository}/`:'/';

export default defineConfig({
  base:process.env.PAGES_BASE||(process.env.GITHUB_ACTIONS==='true'?pagesBase:'/'),
});
