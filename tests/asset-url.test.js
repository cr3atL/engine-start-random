import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl} from '../src/asset-url.js';

test('model and texture URLs stay inside a GitHub Pages repository path',()=>{
  for(const file of ['assets/models/cc110-rebuilt.glb','assets/studio.env','assets/boot-leather-albedo.png']){
    assert.equal(assetUrl(file,'/engine-start-random/'),`/engine-start-random/${file}`);
    assert.equal(assetUrl(file,'/'),`/${file}`);
    assert.equal(assetUrl('/'+file,'/other-game'),`/other-game/${file}`);
  }
});
