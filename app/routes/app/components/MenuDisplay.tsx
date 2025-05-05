import { useState, useEffect } from "react";
import { Banner, Card, ResourceList, Thumbnail, Text, ButtonGroup, Button } from "@shopify/polaris";
import type { MenuItem } from "@prisma/client";

interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
}

interface MenuDisplayProps {
  branchId: string;
  onCheckout: (cartItems: CartItem[]) => void;
}

export function MenuDisplay({ branchId, onCheckout }: MenuDisplayProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/menu?branchId=${branchId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch menu items");
        }

        const data = await response.json();
        setMenuItems(data.menu.flat() || []);
      } catch (err) {
        setError("Error loading menu. Please try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (branchId) {
      fetchMenuItems();
    }
  }, [branchId]);

  const addToCart = (menuItem: MenuItem) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === menuItem.id);

      if (existingItem) {
        return prevItems.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { id: menuItem.id, menuItem, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) =>
      total + (item.menuItem.price * item.quantity), 0
    );
  };

  const handleCheckout = () => {
    onCheckout(cartItems);
  };

  if (isLoading) {
    return <Card><Card.Section>Loading menu...</Card.Section></Card>;
  }

  if (error) {
    return <Banner status="critical">{error}</Banner>;
  }

  if (menuItems.length === 0) {
    return <Card><Card.Section>No menu items available for this branch.</Card.Section></Card>;
  }

  return (
    <div className="menu-display">
      <Card title="Menu">
        <ResourceList
          items={menuItems}
          renderItem={(item) => {
            const { id, name, description, price, imageUrl } = item;
            const media = imageUrl
              ? <Thumbnail source={imageUrl} alt={name} />
              : undefined;

            return (
              <ResourceList.Item
                id={id}
                media={media}
                accessibilityLabel={`View details for ${name}`}
                onClick={() => addToCart(item)}
              >
                <Text variant="bodyMd" fontWeight="bold" as="h3">
                  {name}
                </Text>
                {description && (
                  <div>{description}</div>
                )}
                <div>${price.toFixed(2)}</div>
              </ResourceList.Item>
            );
          }}
        />
      </Card>

      <Card title="Your Order">
        <Card.Section>
          {cartItems.length === 0 ? (
            <Text>Your cart is empty. Add items from the menu.</Text>
          ) : (
            <div>
              {cartItems.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-details">
                    <Text variant="bodyMd">{item.menuItem.name}</Text>
                    <Text>${(item.menuItem.price * item.quantity).toFixed(2)}</Text>
                  </div>
                  <div className="cart-item-quantity">
                    <ButtonGroup segmented>
                      <Button
                        size="slim"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </Button>
                      <div className="quantity-display">{item.quantity}</div>
                      <Button
                        size="slim"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </ButtonGroup>
                    <Button
                      plain
                      destructive
                      onClick={() => removeFromCart(item.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <div className="cart-total">
                <Text variant="headingMd">Total: ${getTotalPrice().toFixed(2)}</Text>
              </div>

              <div className="cart-actions">
                <Button primary onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          )}
        </Card.Section>
      </Card>

      <style jsx>{`
        .menu-display {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e5e5;
        }

        .cart-item-quantity {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quantity-display {
          width: 30px;
          text-align: center;
        }

        .cart-total {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 2px solid #e5e5e5;
          text-align: right;
        }

        .cart-actions {
          margin-top: 20px;
        }

        @media (max-width: 768px) {
          .menu-display {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
