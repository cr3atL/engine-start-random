// GitHub project Pages serves this game beneath /<repository>/.
export function assetUrl(path,base=import.meta.env?.BASE_URL??'/'){
  return `${base.replace(/\/?$/,'/')}${path.replace(/^\/+/, '')}`;
}
