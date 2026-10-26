import { assetUrl } from '@/lib/format';

export default function Avatar({ src, name = '', size = 40 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const style = { width: size, height: size };
  return src
    ? <img className="avatar" style={style} src={assetUrl(src)} alt={name} />
    : <span className="avatar ph" style={{ ...style, fontSize: size * 0.38 }}>{initials || '?'}</span>;
}