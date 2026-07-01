// Header cart trigger — bag icon + live item-count badge.
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingBag } from 'lucide-react';
import { $cart, initCart, openCart } from '~/stores/cart';

export default function CartButton() {
  const cart = useStore($cart);

  // Hydrate the cart once when the first island mounts.
  useEffect(() => {
    initCart();
  }, []);

  const count = cart?.totalQuantity ?? 0;

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative grid h-[43px] w-[43px] place-items-center rounded-sm bg-dark text-white transition-fluid hover:bg-dark-hover"
      aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? '' : 's'}` : 'Open cart'}
    >
      <ShoppingBag size={20} strokeWidth={1.7} />
      {count > 0 && (
        <span className="absolute right-[3px] top-1 grid h-[17px] min-w-[17px] place-items-center rounded-pill bg-coral px-1.5 text-[9.5px] font-bold leading-none text-white tabular">
          {count}
        </span>
      )}
    </button>
  );
}
