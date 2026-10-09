import { useEffect, useMemo, useState } from "react";



import "./App.css";

import "./Auth.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5050").replace(/\/$/, "");







const categories = ["All Products", "Electronics", "Fashion", "Accessories"];







const imageUrl = (image, width = 700) => {

  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) return image;

  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&q=80`;

};



const normalizeCart = (cartData) =>

  (cartData?.items || [])

    .filter((item) => item.product)

    .map((item) => ({

      ...item.product,

      id: item.product._id || item.product.id,

      oldPrice: item.product.oldPrice ?? null,

      rating: Number(item.product.rating ?? 0),

      color: item.product.color || "#f2f1e9",

      quantity: item.quantity,

    }));



const money = (amount) =>



  new Intl.NumberFormat("en-IN", {



    style: "currency",



    currency: "INR",



    maximumFractionDigits: 0,



  }).format(amount);







function App() {



  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");



  const [category, setCategory] = useState("All Products");



  const [search, setSearch] = useState("");



  const [cart, setCart] = useState([]);



  const [favorites, setFavorites] = useState([]);



  const [notice, setNotice] = useState("");



  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const [checkoutError, setCheckoutError] = useState("");

  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);

  const [orders, setOrders] = useState([]);

  const [ordersBusy, setOrdersBusy] = useState(false);

  const [shipping, setShipping] = useState({

    fullName: "",

    phone: "",

    address: "",

    city: "",

    state: "",

    postalCode: "",

  });

  const [authOpen, setAuthOpen] = useState(false);

  const [authMode, setAuthMode] = useState("login");

  const [authName, setAuthName] = useState("");

  const [authEmail, setAuthEmail] = useState("");

  const [authPassword, setAuthPassword] = useState("");

  const [authBusy, setAuthBusy] = useState(false);

  const [authError, setAuthError] = useState("");

  const [currentUser, setCurrentUser] = useState(() => {

    try {

      const saved = localStorage.getItem("nova_user");

      return saved ? JSON.parse(saved) : null;

    } catch {

      return null;

    }

  });



  useEffect(() => {

    if (currentUser && localStorage.getItem("nova_token")) {

      refreshCart();

    } else {

      setCart([]);

    }

    // refreshCart intentionally reads the latest saved token.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [currentUser]);



  useEffect(() => {

    let cancelled = false;



    async function loadProducts() {

      try {

        const response = await fetch(`${API_URL}/api/products`);



        if (!response.ok) {

          throw new Error(

            `Request failed (${response.status}). Check that the backend is running.`

          );

        }



        const data = await response.json();



        if (!data.success || !Array.isArray(data.products)) {

          throw new Error(data.message || "The server returned an unexpected response.");

        }



        if (!cancelled) {

          setProducts(

            data.products.map((product) => ({

              ...product,

              id: product._id || product.id,

              oldPrice: product.oldPrice ?? null,

              rating: Number(product.rating ?? 0),

              color: product.color || "#f2f1e9",

            }))

          );

          setLoadError("");

        }

      } catch (error) {

        if (!cancelled) {

          setLoadError(error.message || "Could not load products.");

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    }



    loadProducts();



    return () => {

      cancelled = true;

    };

  }, []);









  const filteredProducts = useMemo(() => {



    return products.filter((product) => {



      const matchesCategory =



        category === "All Products" || product.category === category;



      const matchesSearch = product.name



        .toLowerCase()



        .includes(search.toLowerCase().trim());



      return matchesCategory && matchesSearch;



    });



  }, [products, category, search]);







  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);



  const cartTotal = cart.reduce(



    (total, item) => total + item.price * item.quantity,



    0



  );







  async function cartRequest(path = "", options = {}) {

    const token = localStorage.getItem("nova_token");



    if (!token) {

      setAuthMode("login");

      setAuthError("");

      setAuthOpen(true);

      throw new Error("Please log in to save items to your cart.");

    }



    const response = await fetch(`${API_URL}/api/cart${path}`, {

      ...options,

      headers: {

        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,

        ...(options.headers || {}),

      },

    });



    const data = await response.json();



    if (!response.ok || !data.success) {

      if (response.status === 401) {

        logout();

        setAuthMode("login");

        setAuthOpen(true);

      }

      throw new Error(data.message || "Cart request failed.");

    }



    return data;

  }



  async function refreshCart() {

    const token = localStorage.getItem("nova_token");

    if (!token) {

      setCart([]);

      return;

    }



    try {

      const data = await cartRequest();

      setCart(normalizeCart(data.cart));

    } catch (error) {

      setNotice(error.message || "Unable to load your saved cart.");

      window.setTimeout(() => setNotice(""), 3000);

    }

  }



  async function placeOrder(event) {

    event.preventDefault();

    setCheckoutBusy(true);

    setCheckoutError("");



    try {

      const token = localStorage.getItem("nova_token");

      if (!token) throw new Error("Please log in before placing an order.");



      const response = await fetch(`${API_URL}/api/orders`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify({ shippingAddress: shipping }),

      });



      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Unable to place your order.");

      }



      setCart([]);

      setCheckoutOpen(false);

      setCartOpen(false);

      setNotice(`Order placed successfully! Order ID: ${data.order._id}`);

      window.setTimeout(() => setNotice(""), 6000);

      setShipping({

        fullName: currentUser?.name || "",

        phone: "",

        address: "",

        city: "",

        state: "",

        postalCode: "",

      });

    } catch (error) {

      setCheckoutError(error.message || "Unable to place your order.");

    } finally {

      setCheckoutBusy(false);

    }

  }



  async function openOrderHistory() {

    if (!localStorage.getItem("nova_token")) {

      setAuthMode("login");

      setAuthError("");

      setAuthOpen(true);

      return;

    }



    setOrderHistoryOpen(true);

    setOrdersBusy(true);



    try {

      const response = await fetch(`${API_URL}/api/orders`, {

        headers: {

          Authorization: `Bearer ${localStorage.getItem("nova_token")}`,

        },

      });

      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Unable to load your orders.");

      }



      setOrders(data.orders || []);

    } catch (error) {

      setNotice(error.message || "Unable to load order history.");

      window.setTimeout(() => setNotice(""), 3500);

    } finally {

      setOrdersBusy(false);

    }

  }



  async function addToCart(product) {

    if (!localStorage.getItem("nova_token")) {

      setAuthMode("login");

      setAuthError("");

      setAuthOpen(true);

      setNotice("Log in to save products to your cart.");

      window.setTimeout(() => setNotice(""), 2800);

      return;

    }



    try {

      const data = await cartRequest("/items", {

        method: "POST",

        body: JSON.stringify({ productId: product.id, quantity: 1 }),

      });

      setCart(normalizeCart(data.cart));

      setNotice(`${product.name} added to your bag`);

    } catch (error) {

      setNotice(error.message || "Unable to add this product.");

    }



    window.setTimeout(() => setNotice(""), 2800);

  }



  async function changeQuantity(id, amount) {

    const item = cart.find((entry) => entry.id === id);

    if (!item) return;



    try {

      if (item.quantity + amount < 1) {

        const data = await cartRequest(`/items/${id}`, { method: "DELETE" });

        setCart(normalizeCart(data.cart));

      } else {

        const data = await cartRequest(`/items/${id}`, {

          method: "PATCH",

          body: JSON.stringify({ quantity: item.quantity + amount }),

        });

        setCart(normalizeCart(data.cart));

      }

    } catch (error) {

      setNotice(error.message || "Unable to update your cart.");

      window.setTimeout(() => setNotice(""), 2800);

    }

  }



  async function removeFromCart(id) {

    try {

      const data = await cartRequest(`/items/${id}`, { method: "DELETE" });

      setCart(normalizeCart(data.cart));

      setNotice("Product removed from your bag.");

    } catch (error) {

      setNotice(error.message || "Unable to remove this product.");

    }

    window.setTimeout(() => setNotice(""), 2500);

  }







  function toggleFavorite(id) {



    setFavorites((current) =>



      current.includes(id)



        ? current.filter((item) => item !== id)



        : [...current, id]



    );



  }



  async function submitAuth(event) {

    event.preventDefault();

    setAuthError("");

    setAuthBusy(true);



    try {

      const endpoint = authMode === "register" ? "register" : "login";

      const payload = authMode === "register"

        ? { name: authName.trim(), email: authEmail.trim(), password: authPassword }

        : { email: authEmail.trim(), password: authPassword };



      const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(payload),

      });

      const data = await response.json();



      if (!response.ok || !data.success) {

        throw new Error(data.message || "Authentication failed. Please try again.");

      }



      localStorage.setItem("nova_token", data.token);

      localStorage.setItem("nova_user", JSON.stringify(data.user));

      setCurrentUser(data.user);

      // The cart-loading effect fetches the user's saved cart.

      setAuthOpen(false);

      setAuthName("");

      setAuthEmail("");

      setAuthPassword("");

      setNotice(authMode === "register" ? "Welcome to NOVA! Your account is ready." : `Welcome back, ${data.user.name}!`);

      window.setTimeout(() => setNotice(""), 2800);

    } catch (error) {

      setAuthError(error.message || "Could not connect to the server.");

    } finally {

      setAuthBusy(false);

    }

  }



  function logout() {

    localStorage.removeItem("nova_token");

    localStorage.removeItem("nova_user");

    setCurrentUser(null);

    setCart([]);

    setCartOpen(false);

    setNotice("You have been signed out.");

    window.setTimeout(() => setNotice(""), 2200);

  }







  return (



    <div className="store">



      <div className="announcement">



        <span>Complimentary shipping on orders over ₹2,999</span>



        <span className="announcement-right">Thoughtfully chosen. Made to last.</span>



      </div>







      <header className="navbar">



        <a className="brand" href="#home" aria-label="NOVA home">



          nova<span>.</span>



        </a>







        <nav className="desktop-nav" aria-label="Main navigation">



          <a className="active-link" href="#shop">Shop</a>



          <a href="#shop" onClick={() => setCategory("Electronics")}>Electronics</a>



          <a href="#shop" onClick={() => setCategory("Fashion")}>Fashion</a>



          <a href="#about">Our story</a>



        </nav>







        <div className="nav-actions">



          <label className="search-box">



            <span aria-hidden="true">⌕</span>



            <input



              aria-label="Search products"



              placeholder="Search products"



              value={search}



              onChange={(event) => {



                setSearch(event.target.value);



                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });



              }}



            />



          </label>



          <button className="icon-button favorite-nav" onClick={() => {



            setCategory("All Products");



            setSearch("");



            document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });



          }} aria-label="Browse all products">



            ♡



          </button>



          {currentUser && (

            <button className="icon-button" onClick={openOrderHistory} aria-label="View my orders" title="My orders">

              Orders

            </button>

          )}



          {currentUser ? (

            <button className="nova-account-button" onClick={logout} title="Click to sign out">

              <span className="account-dot">{currentUser.name?.charAt(0)?.toUpperCase() || "N"}</span>

              <span className="account-label">{currentUser.name?.split(" ")[0] || "Account"} · Sign out</span>

            </button>

          ) : (

            <button className="nova-account-button" onClick={() => { setAuthMode("login"); setAuthError(""); setAuthOpen(true); }}>

              <span className="account-dot">♙</span>

              <span className="account-label">Log in</span>

            </button>

          )}



          <button className="bag-button" onClick={() => { setCartOpen(true); if (currentUser) refreshCart(); }}>



            <span>Bag</span><span className="bag-count">{cartCount}</span>



          </button>



        </div>



      </header>







      <main>



        <section className="hero" id="home">



          <div className="hero-copy">



            <div className="eyebrow"><span className="eyebrow-line" /> THE EVERYDAY EDIT</div>



            <h1>Good things.<br />Better <em>living.</em></h1>



            <p>Discover thoughtful essentials for the way you live, work and move through the world.</p>



            <a className="primary-button" href="#shop">Explore the collection <span>↗</span></a>



            <div className="hero-note"><span className="note-star">✳</span> Curated with care. Delivered with love.</div>



          </div>







          <div className="hero-art">



            <img



              src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85"



              alt="Carefully curated contemporary fashion and lifestyle essentials"



            />



            <div className="hero-stamp">



              <span>THE NOVA STANDARD</span>



              <strong>Less, but<br />better.</strong>



              <span>EST. 2026 · INDIA</span>



            </div>



            <div className="hero-image-caption">Objects for everyday living <span>01 / 04</span></div>



          </div>



          <div className="hero-index">N° 001 — THE ESSENTIALS COLLECTION</div>



        </section>







        <section className="benefits" aria-label="Store benefits">



          <div><span>✳</span><p><strong>Thoughtful quality</strong><small>Made for everyday life</small></p></div>



          <div><span>↗</span><p><strong>Free shipping</strong><small>On orders over ₹2,999</small></p></div>



          <div><span>↺</span><p><strong>Easy returns</strong><small>Hassle-free within 7 days</small></p></div>



          <div><span>♡</span><p><strong>Secure checkout</strong><small>Your details stay protected</small></p></div>



        </section>







        <section className="shop-section" id="shop">



          <div className="section-heading">



            <div>



              <div className="eyebrow"><span className="eyebrow-line" /> THE COLLECTION</div>



              <h2>Find your <em>everyday.</em></h2>



              <p>Good design, useful things, and little details that make a difference.</p>



            </div>



            <a className="text-link" href="#shop" onClick={() => { setCategory("All Products"); setSearch(""); }}>View everything ↗</a>



          </div>







          <div className="shop-toolbar">



            <div className="category-tabs">



              {categories.map((item) => (



                <button



                  key={item}



                  className={category === item ? "category-tab selected" : "category-tab"}



                  onClick={() => setCategory(item)}



                >



                  {item}



                </button>



              ))}



            </div>



            <span className="product-count">{filteredProducts.length} PRODUCTS</span>



          </div>







          {loading ? (

            <div className="empty-results">

              <span>↻</span>

              <h3>Finding your everyday essentials...</h3>

              <p>Loading products from the NOVA store.</p>

            </div>

          ) : loadError ? (

            <div className="empty-results">

              <span>!</span>

              <h3>We couldn't load the collection</h3>

              <p>{loadError}</p>

              <button className="primary-button" onClick={() => window.location.reload()}>

                Try again ↻

              </button>

            </div>

          ) : filteredProducts.length ? (

            <div className="product-grid">



              {filteredProducts.map((product, index) => (



                <article className="product-card" key={product.id}>



                  <div className="product-image" style={{ backgroundColor: product.color }}>



                    <img



                      src={imageUrl(product.image, 700)}



                      alt={product.name}



                      loading={index > 3 ? "lazy" : "eager"}



                    />



                    {product.tag && <span className="product-tag">{product.tag}</span>}



                    <button



                      className={favorites.includes(product.id) ? "heart-button favorited" : "heart-button"}



                      aria-label={favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"}



                      onClick={() => toggleFavorite(product.id)}



                    >



                      {favorites.includes(product.id) ? "♥" : "♡"}



                    </button>



                    <button className="quick-add" onClick={() => addToCart(product)}>



                      Add to bag <span>＋</span>



                    </button>



                  </div>



                  <div className="product-info">



                    <div className="product-category">{product.category}</div>



                    <div className="product-title-row">



                      <h3>{product.name}</h3>



                      <span className="rating">★ {product.rating}</span>



                    </div>



                    <div className="price-row">



                      <strong>{money(product.price)}</strong>



                      {product.oldPrice && <del>{money(product.oldPrice)}</del>}



                    </div>



                  </div>



                </article>



              ))}



            </div>



          ) : (



            <div className="empty-results">



              <span>⌕</span>



              <h3>No products found</h3>



              <p>Try a different search or browse our full collection.</p>



              <button className="primary-button" onClick={() => { setSearch(""); setCategory("All Products"); }}>Clear filters</button>



            </div>



          )}



        </section>







        <section className="editorial" id="about">



          <div className="editorial-image">



            <img



              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1100&q=85"



              alt="A considered, minimal retail space"



              loading="lazy"



            />



          </div>



          <div className="editorial-copy">



            <div className="eyebrow"><span className="eyebrow-line" /> A LITTLE ABOUT US</div>



            <h2>Buy less.<br />Choose <em>better.</em></h2>



            <p>We believe everyday things deserve a little more thought. NOVA brings together useful essentials, timeless design and quality you can feel.</p>



            <a className="text-link" href="#shop">Get to know the collection ↗</a>



          </div>



        </section>







        <section className="newsletter">



          <span className="newsletter-icon">✳</span>



          <div>



            <h2>A little good in your inbox.</h2>



            <p>New arrivals, considered finds, and notes from NOVA.</p>



          </div>



          <form onSubmit={(event) => { event.preventDefault(); setNotice("Thanks for your interest in NOVA!"); window.setTimeout(() => setNotice(""), 2500); }}>



            <input type="email" placeholder="Your email address" aria-label="Your email address" required />



            <button type="submit">Join us ↗</button>



          </form>



        </section>



      </main>







      <footer className="footer">



        <a className="brand footer-brand" href="#home">nova<span>.</span></a>



        <p>Considered essentials for everyday living.</p>



        <span>© 2026 NOVA STUDIO</span>



      </footer>







      {notice && <div className="toast" role="status">✓ &nbsp; {notice}</div>}







      {authOpen && (

        <div className="auth-backdrop" onClick={() => setAuthOpen(false)}>

          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>

            <button className="auth-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Close sign in">×</button>

            <div className="auth-brand">nova<span>.</span></div>

            <div className="eyebrow"><span className="eyebrow-line" /> YOUR NOVA ACCOUNT</div>

            <h2 id="auth-title">{authMode === "login" ? <>Welcome <em>back.</em></> : <>Make it <em>yours.</em></>}</h2>

            <p className="auth-intro">{authMode === "login" ? "Sign in to continue your everyday edit." : "Create an account for a more personal NOVA experience."}</p>



            <form className="auth-form" onSubmit={submitAuth}>

              {authMode === "register" && (

                <label>Full name

                  <input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Your name" autoComplete="name" required maxLength={80} />

                </label>

              )}

              <label>Email address

                <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />

              </label>

              <label>Password

                <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder={authMode === "register" ? "At least 8 characters" : "Your password"} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 8 : undefined} required />

              </label>

              {authError && <p className="auth-error" role="alert">{authError}</p>}

              <button className="auth-submit" type="submit" disabled={authBusy}>

                {authBusy ? "Please wait…" : authMode === "login" ? "Sign in ↗" : "Create account ↗"}

              </button>

            </form>



            <p className="auth-switch">

              {authMode === "login" ? "New to NOVA?" : "Already have an account?"}{" "}

              <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>

                {authMode === "login" ? "Create an account" : "Sign in"}

              </button>

            </p>

            <p className="auth-footnote">Your password is securely handled by NOVA's authentication API.</p>

          </section>

        </div>

      )}



      {checkoutOpen && (

        <div className="auth-backdrop" onClick={() => !checkoutBusy && setCheckoutOpen(false)}>

          <section className="auth-modal checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onClick={(event) => event.stopPropagation()}>

            <button className="auth-close" type="button" onClick={() => !checkoutBusy && setCheckoutOpen(false)} aria-label="Close checkout">×</button>

            <div className="auth-brand">nova<span>.</span></div>

            <div className="eyebrow"><span className="eyebrow-line" /> DELIVERY DETAILS</div>

            <h2 id="checkout-title">Almost <em>yours.</em></h2>

            <p className="auth-intro">Cash on Delivery · Order total: <strong>{money(cartTotal)}</strong></p>

            <form className="auth-form" onSubmit={placeOrder}>

              <label>Full name

                <input value={shipping.fullName} onChange={(event) => setShipping({ ...shipping, fullName: event.target.value })} autoComplete="name" required maxLength={100} />

              </label>

              <label>Phone number

                <input value={shipping.phone} onChange={(event) => setShipping({ ...shipping, phone: event.target.value })} autoComplete="tel" required maxLength={20} />

              </label>

              <label>Street address

                <input value={shipping.address} onChange={(event) => setShipping({ ...shipping, address: event.target.value })} autoComplete="street-address" required maxLength={200} />

              </label>

              <div className="checkout-fields">

                <label>City

                  <input value={shipping.city} onChange={(event) => setShipping({ ...shipping, city: event.target.value })} autoComplete="address-level2" required maxLength={80} />

                </label>

                <label>State

                  <input value={shipping.state} onChange={(event) => setShipping({ ...shipping, state: event.target.value })} autoComplete="address-level1" required maxLength={80} />

                </label>

              </div>

              <label>Postal code

                <input value={shipping.postalCode} onChange={(event) => setShipping({ ...shipping, postalCode: event.target.value })} autoComplete="postal-code" required maxLength={12} />

              </label>

              {checkoutError && <p className="auth-error" role="alert">{checkoutError}</p>}

              <button className="auth-submit" type="submit" disabled={checkoutBusy || cart.length === 0}>

                {checkoutBusy ? "Placing order…" : `Place order · ${money(cartTotal)}`}

              </button>

            </form>

            <p className="auth-footnote">No online payment is taken. Your order will be placed with Cash on Delivery.</p>

          </section>

        </div>

      )}



      {orderHistoryOpen && (

        <div className="auth-backdrop" onClick={() => setOrderHistoryOpen(false)}>

          <section className="auth-modal orders-modal" role="dialog" aria-modal="true" aria-labelledby="orders-title" onClick={(event) => event.stopPropagation()}>

            <button className="auth-close" type="button" onClick={() => setOrderHistoryOpen(false)} aria-label="Close order history">×</button>

            <div className="auth-brand">nova<span>.</span></div>

            <div className="eyebrow"><span className="eyebrow-line" /> YOUR NOVA ACCOUNT</div>

            <h2 id="orders-title">Your <em>orders.</em></h2>

            {ordersBusy ? (

              <p className="auth-intro">Loading your orders…</p>

            ) : orders.length === 0 ? (

              <p className="auth-intro">You haven't placed any orders yet.</p>

            ) : (

              <div className="order-history-list">

                {orders.map((order) => {
                  const trackingSteps = ["Pending", "Processing", "Shipped", "Delivered"];
                  const trackingIndex = trackingSteps.indexOf(order.status);
                  const isCancelled = order.status === "Cancelled";

                  return (
                    <article className="order-history-card" key={order._id}>
                      <div className="order-history-top">
                        <strong>Order #{order._id.slice(-7).toUpperCase()}</strong>
                        <span>{order.status}</span>
                      </div>
                      <p>
                        {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        {" · "}
                        {order.items.length} item(s)
                      </p>
                      <strong>{money(order.totalAmount)}</strong>

                      {isCancelled ? (
                        <p className="tracking-cancelled">This order was cancelled.</p>
                      ) : (
                        <div className="tracking-progress">
                          {trackingSteps.map((step, index) => (
                            <div
                              className={`tracking-step ${trackingIndex >= index ? "completed" : ""}`}
                              key={step}
                            >
                              <span className="tracking-dot">
                                {trackingIndex > index ? "✓" : index + 1}
                              </span>
                              <small>{step}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      <small>
                        Payment: {order.paymentMethod} · {order.paymentStatus}
                      </small>
                    </article>
                  );
                })}

              </div>

            )}

            <button className="auth-submit" type="button" onClick={() => setOrderHistoryOpen(false)}>Continue shopping</button>

          </section>

        </div>

      )}



      {cartOpen && (



        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>



          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>



            <div className="drawer-heading">



              <div><span className="eyebrow">YOUR SELECTION</span><h2>Your bag <em>({cartCount})</em></h2></div>



              <button className="close-button" onClick={() => setCartOpen(false)} aria-label="Close bag">×</button>



            </div>



            {cart.length === 0 ? (



              <div className="empty-cart"><span>♡</span><h3>Your bag is taking a break.</h3><p>Find something you'll love in our collection.</p><button className="primary-button" onClick={() => { setCartOpen(false); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }}>Explore products ↗</button></div>



            ) : (



              <>



                <div className="cart-items">



                  {cart.map((item) => (



                    <div className="cart-item" key={item.id}>



                      <img src={imageUrl(item.image, 200)} alt={item.name} />



                      <div className="cart-item-info"><h3>{item.name}</h3><strong>{money(item.price)}</strong><div className="quantity"><button onClick={() => changeQuantity(item.id, -1)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} aria-label="Increase quantity">+</button></div></div>



                      <button className="remove-item" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}>×</button>



                    </div>



                  ))}



                </div>



                <div className="cart-summary"><div><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><p>Shipping and taxes calculated at checkout.</p><button className="checkout-button" onClick={() => { if (!currentUser || !localStorage.getItem("nova_token")) { setCartOpen(false); setAuthMode("login"); setAuthError(""); setAuthOpen(true); return; } setCheckoutError(""); setShipping((current) => ({ ...current, fullName: current.fullName || currentUser.name || "" })); setCheckoutOpen(true); }}>Continue to checkout ↗</button></div>



              </>



            )}



          </aside>



        </div>



      )}



    </div>



  );



}







export default App;
