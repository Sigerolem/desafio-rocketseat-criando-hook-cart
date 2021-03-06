import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExistsAtCart = updatedCart.find((product) => product.id === productId);

      const { data: { amount: stockAmount } } = await api.get<Stock>(`/stock/${productId}`);

      const amount = productExistsAtCart ? productExistsAtCart.amount + 1 : 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExistsAtCart) {
        productExistsAtCart.amount = amount;
      } else {
        const { data: product } = await api.get<Omit<Product, 'amount'>>(`/products/${productId}`);
        const newProduct = { ...product, amount };
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productExistsAtCart = updatedCart.find((product) => product.id === productId);
      if (productExistsAtCart) {
        const newArray = updatedCart.filter(product => product.id !== productId)
        setCart(newArray)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newArray))
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }
      const updatedCart = [...cart]
      const productExistsAtCart = updatedCart.find(product => product.id === productId)

      const { data: { amount: stockAmount } } = await api.get<Stock>(`/stock/${productId}`)

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else if (productExistsAtCart) {
        productExistsAtCart.amount = amount
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
