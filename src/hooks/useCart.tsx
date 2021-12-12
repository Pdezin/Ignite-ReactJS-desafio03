import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: dataProduct } = await api.get(`/products/${productId}`);

      const { data: dataStock } = await api.get(`/stock/${productId}`);

      const productCartIndex = cart.findIndex(
        (product) => product.id === productId
      );

      if (productCartIndex !== -1) {
        if (dataStock.amount <= cart[productCartIndex].amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const newCart = cart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: product.amount + 1,
            };
          } else {
            return product;
          }
        });

        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        const newDataProduct: Product = {
          ...dataProduct,
          amount: 1,
        };

        setCart([...cart, newDataProduct]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, newDataProduct])
        );
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    const productIndex = cart.findIndex((product) => product.id === productId);
    try {
      if (productIndex === -1) {
        throw Error();
      }
      const newCart = cart.filter((product) => product.id !== productId);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      const stock = await api.get(`/stock/${productId}`);

      if (amount > stock.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = [...cart];
      const productExist = newCart.find((product) => product.id === productId);

      if (productExist) {
        productExist.amount = amount;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
