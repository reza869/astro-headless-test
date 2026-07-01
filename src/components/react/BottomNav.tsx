// ============================================================
//  BottomNav — mobile bottom tab bar (≤5 items, icon + label).
//  The Cart tab opens the shared drawer and shows the live badge.
// ============================================================
import { useStore } from '@nanostores/react';
import { Home, LayoutGrid, Shirt, ShoppingBag } from 'lucide-react';
import { $cart, openCart } from '~/stores/cart';
import { cn } from '~/lib/utils';

interface Props {
  pathname: string;
}

export default function BottomNav({ pathname }: Props) {
  const cart = useStore($cart);
  const count = cart?.totalQuantity ?? 0;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const item = (active: boolean) =>
    cn(
      'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.65rem] font-medium transition-fluid',
      active ? 'text-text-primary' : 'text-text-muted',
    );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary mobile"
    >
      <a href="/" className={item(isActive('/'))} aria-current={isActive('/') ? 'page' : undefined}>
        <Home size={20} strokeWidth={1.6} />
        Home
      </a>
      <a
        href="/products"
        className={item(isActive('/products'))}
        aria-current={isActive('/products') ? 'page' : undefined}
      >
        <Shirt size={20} strokeWidth={1.6} />
        Shop
      </a>
      <a
        href="/collections"
        className={item(isActive('/collections'))}
        aria-current={isActive('/collections') ? 'page' : undefined}
      >
        <LayoutGrid size={20} strokeWidth={1.6} />
        Shop
      </a>
      <button
        type="button"
        onClick={openCart}
        className={item(false)}
        aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? '' : 's'}` : 'Open cart'}
      >
        <span className="relative">
          <ShoppingBag size={20} strokeWidth={1.6} />
          {count > 0 && (
            <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 font-mono text-[9px] font-semibold leading-none text-white">
              {count}
            </span>
          )}
        </span>
        Cart
      </button>
    </nav>
  );
}
