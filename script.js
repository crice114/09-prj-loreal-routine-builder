const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const clearSelectionsBtn = document.getElementById("clearSelections");

let selectedProducts = [];
let chatHistory = [];

/* Load product data from JSON */
async function loadProducts() {
  const res = await fetch("products.json");
  const data = await res.json();
  return data.products;
}

/* Show initial message */
productsContainer.innerHTML = `<div class="placeholder-message">Select a category to view products</div>`;

/* Display filtered product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-overlay"><p>${product.description}</p></div>
    </div>
  `).join("");

  document.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = parseInt(card.getAttribute("data-id"));
      loadProducts().then(products => {
        const selected = products.find(p => p.id === id);
        toggleProductSelection(selected);
      });
    });
  });

  highlightSelectedCards();
}

/* Toggle selection */
function toggleProductSelection(product) {
  const index = selectedProducts.findIndex(p => p.id === product.id);
  if (index === -1) selectedProducts.push(product);
  else selectedProducts.splice(index, 1);
  updateSelectedProductsUI();
  highlightSelectedCards();
  saveSelectedProducts();
}

/* Update UI */
function updateSelectedProductsUI() {
  selectedProductsList.innerHTML = selectedProducts.map(product => `
    <div class="selected-item" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <span class="remove-btn" title="Remove">×</span>
    </div>
  `).join("");

  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseInt(btn.parentElement.getAttribute("data-id"));
      selectedProducts = selectedProducts.filter(p => p.id !== id);
      updateSelectedProductsUI();
      highlightSelectedCards();
      saveSelectedProducts();
    });
  });
}

/* Highlight selected product cards */
function highlightSelectedCards() {
  document.querySelectorAll(".product-card").forEach(card => {
    const id = parseInt(card.getAttribute("data-id"));
    card.classList.toggle("selected", selectedProducts.some(p => p.id === id));
  });
}

/* Save selections to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Load from localStorage */
function loadSelectedProductsFromStorage() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
    updateSelectedProductsUI();
    highlightSelectedCards();
  }
}

/* Clear all selections */
if (clearSelectionsBtn) {
  clearSelectionsBtn.addEventListener("click", () => {
    selectedProducts = [];
    localStorage.removeItem("selectedProducts");
    updateSelectedProductsUI();
    highlightSelectedCards();
  });
}

/* Filter by category */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const filtered = products.filter(p => p.category === e.target.value);
  displayProducts(filtered);
});

/* Generate routine */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    alert("Please select at least one product first.");
    return;
  }

  const prompt = `I have selected the following skincare products from L’Oréal:\n${selectedProducts.map((p, i) =>
    `${i + 1}. ${p.name} by ${p.brand} - ${p.category}\nDescription: ${p.description}`
  ).join("\n")}\n\nCan you create a personalized skincare routine using these products?\nPlease explain when and how to use each one.`;

  chatHistory = [{ role: "user", content: prompt }];

  chatWindow.innerHTML += `<div class="chat-message user"><strong>You:</strong> ${prompt.replace(/\n/g, "<br>")}</div>`;
  chatWindow.innerHTML += `<div class="chat-message bot loading"><strong>AI:</strong> Thinking...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: chatHistory,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    chatHistory.push({ role: "assistant", content: reply });

    document.querySelector(".chat-message.bot.loading").remove();
    chatWindow.innerHTML += `<div class="chat-message bot"><strong>AI:</strong> ${reply.replace(/\n/g, "<br>")}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    document.querySelector(".chat-message.bot.loading").remove();
    chatWindow.innerHTML += `<div class="chat-message bot error"><strong>AI:</strong> Sorry, there was an error connecting to OpenAI.</div>`;
    console.error(err);
  }
});

/* Handle follow-up questions */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const userText = input.value.trim();
  if (!userText) return;
  input.value = "";

  chatHistory.push({ role: "user", content: userText });
  chatWindow.innerHTML += `<div class="chat-message user"><strong>You:</strong> ${userText}</div>`;
  chatWindow.innerHTML += `<div class="chat-message bot loading"><strong>AI:</strong> Thinking...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: chatHistory,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    chatHistory.push({ role: "assistant", content: reply });

    document.querySelector(".chat-message.bot.loading").remove();
    chatWindow.innerHTML += `<div class="chat-message bot"><strong>AI:</strong> ${reply.replace(/\n/g, "<br>")}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    document.querySelector(".chat-message.bot.loading").remove();
    chatWindow.innerHTML += `<div class="chat-message bot error"><strong>AI:</strong> Sorry, something went wrong.</div>`;
    console.error(err);
  }
});

/* Initial load */
loadSelectedProductsFromStorage();























//LATEST VERSION OF THE CODE///////

// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const selectedProductsList = document.getElementById("selectedProductsList");
// const generateRoutineBtn = document.getElementById("generateRoutine");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");
// const userInput = document.getElementById("userInput");

// let selectedProducts = [];
// let messages = []; // Stores full chat history

// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//       <div class="product-card" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <div class="product-info">
//           <h3>${product.name}</h3>
//           <p>${product.brand}</p>
//         </div>
//         <div class="product-overlay">
//           <p>${product.description}</p>
//         </div>
//       </div>
//     `
//     )
//     .join("");

//   const cards = document.querySelectorAll(".product-card");
//   cards.forEach((card) => {
//     card.addEventListener("click", () => {
//       const productId = parseInt(card.getAttribute("data-id"));
//       const selectedProduct = products.find((p) => p.id === productId);
//       toggleProductSelection(selectedProduct);
//     });
//   });

//   highlightSelectedCards();
// }

// function toggleProductSelection(product) {
//   const index = selectedProducts.findIndex((p) => p.id === product.id);
//   if (index === -1) {
//     selectedProducts.push(product);
//   } else {
//     selectedProducts.splice(index, 1);
//   }
//   updateSelectedProductsUI();
//   highlightSelectedCards();
// }

// function updateSelectedProductsUI() {
//   selectedProductsList.innerHTML = selectedProducts
//     .map(
//       (product) => `
//       <div class="selected-item" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <span class="remove-btn" title="Remove">×</span>
//       </div>
//     `
//     )
//     .join("");

//   const removeButtons = document.querySelectorAll(".remove-btn");
//   removeButtons.forEach((button) => {
//     button.addEventListener("click", (e) => {
//       e.stopPropagation();
//       const productId = parseInt(button.parentElement.getAttribute("data-id"));
//       selectedProducts = selectedProducts.filter((p) => p.id !== productId);
//       updateSelectedProductsUI();
//       highlightSelectedCards();
//     });
//   });
// }

// function highlightSelectedCards() {
//   const productCards = document.querySelectorAll(".product-card");
//   productCards.forEach((card) => {
//     const productId = parseInt(card.getAttribute("data-id"));
//     const isSelected = selectedProducts.some((p) => p.id === productId);
//     card.classList.toggle("selected", isSelected);
//   });
// }

// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );
//   displayProducts(filteredProducts);
// });

// generateRoutineBtn.addEventListener("click", async () => {
//   if (selectedProducts.length === 0) {
//     alert("Please select at least one product first.");
//     return;
//   }

//   const prompt = `
// I have selected the following products from L’Oréal:
// ${selectedProducts
//   .map(
//     (p, i) =>
//       `${i + 1}. ${p.name} by ${p.brand} - ${p.category}\nDescription: ${
//         p.description
//       }`
//   )
//   .join("\n")}

// Can you create a personalized skincare routine using these products?
// Please explain when and how to use each one.
// `;

//   addMessage("user", prompt);
//   displayMessage("You", prompt);
//   displayLoading();

//   try {
//     const res = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${apiKey}`,
//       },
//       body: JSON.stringify({
//         model: "gpt-3.5-turbo",
//         messages,
//         temperature: 0.7,
//       }),
//     });

//     const data = await res.json();
//     const reply = data.choices?.[0]?.message?.content || "No response.";

//     addMessage("assistant", reply);
//     removeLoading();
//     displayMessage("AI", reply);
//   } catch (err) {
//     removeLoading();
//     displayMessage("AI", "Sorry, there was an error connecting to OpenAI.");
//     console.error(err);
//   }
// });

// chatForm.addEventListener("submit", async (e) => {
//   e.preventDefault();
//   const question = userInput.value.trim();
//   if (!question) return;

//   addMessage("user", question);
//   displayMessage("You", question);
//   userInput.value = "";
//   displayLoading();

//   try {
//     const res = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${apiKey}`,
//       },
//       body: JSON.stringify({
//         model: "gpt-3.5-turbo",
//         messages,
//         temperature: 0.7,
//       }),
//     });

//     const data = await res.json();
//     const reply = data.choices?.[0]?.message?.content || "No response.";

//     addMessage("assistant", reply);
//     removeLoading();
//     displayMessage("AI", reply);
//   } catch (err) {
//     removeLoading();
//     displayMessage("AI", "Sorry, there was an error connecting to OpenAI.");
//     console.error(err);
//   }
// });

// // Utility functions
// function addMessage(role, content) {
//   messages.push({ role, content });
// }

// function displayMessage(sender, text) {
//   chatWindow.innerHTML += `
//     <div class="chat-message ${sender === "You" ? "user" : "bot"}">
//       <strong>${sender}:</strong> ${text.replace(/\n/g, "<br>")}
//     </div>
//   `;
//   chatWindow.scrollTop = chatWindow.scrollHeight;
// }

// function displayLoading() {
//   chatWindow.innerHTML += `
//     <div class="chat-message bot loading">
//       <strong>AI:</strong> Thinking...
//     </div>
//   `;
//   chatWindow.scrollTop = chatWindow.scrollHeight;
// }

// function removeLoading() {
//   const loading = document.querySelector(".chat-message.bot.loading");
//   if (loading) loading.remove();
// }

///LATEST VERSION OF THE CODE///////

// /* Get references to DOM elements */
// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const selectedProductsList = document.getElementById("selectedProductsList");
// const generateRoutineBtn = document.getElementById("generateRoutine");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");

// /* Initialize selected products array */
// let selectedProducts = [];

// /* Show initial placeholder */
// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// /* Load product data from JSON file */
// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// /* Display product cards with hover overlay */
// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//       <div class="product-card" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <div class="product-info">
//           <h3>${product.name}</h3>
//           <p>${product.brand}</p>
//         </div>
//         <div class="product-overlay">
//           <p>${product.description}</p>
//         </div>
//       </div>
//     `
//     )
//     .join("");

//   const cards = document.querySelectorAll(".product-card");
//   cards.forEach((card) => {
//     card.addEventListener("click", () => {
//       const productId = parseInt(card.getAttribute("data-id"));
//       const selectedProduct = products.find((p) => p.id === productId);
//       toggleProductSelection(selectedProduct);
//     });
//   });

//   highlightSelectedCards();
// }

// /* Toggle selection of a product */
// function toggleProductSelection(product) {
//   const index = selectedProducts.findIndex((p) => p.id === product.id);
//   if (index === -1) {
//     selectedProducts.push(product);
//   } else {
//     selectedProducts.splice(index, 1);
//   }
//   updateSelectedProductsUI();
//   highlightSelectedCards();
// }

// /* Update the Selected Products section */
// function updateSelectedProductsUI() {
//   selectedProductsList.innerHTML = selectedProducts
//     .map(
//       (product) => `
//       <div class="selected-item" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <span class="remove-btn" title="Remove">×</span>
//       </div>
//     `
//     )
//     .join("");

//   const removeButtons = document.querySelectorAll(".remove-btn");
//   removeButtons.forEach((button) => {
//     button.addEventListener("click", (e) => {
//       e.stopPropagation();
//       const productId = parseInt(button.parentElement.getAttribute("data-id"));
//       selectedProducts = selectedProducts.filter((p) => p.id !== productId);
//       updateSelectedProductsUI();
//       highlightSelectedCards();
//     });
//   });
// }

// /* Visually highlight selected cards */
// function highlightSelectedCards() {
//   const productCards = document.querySelectorAll(".product-card");
//   productCards.forEach((card) => {
//     const productId = parseInt(card.getAttribute("data-id"));
//     const isSelected = selectedProducts.some((p) => p.id === productId);
//     card.classList.toggle("selected", isSelected);
//   });
// }

// /* Filter and display products by category */
// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );
//   displayProducts(filteredProducts);
// });

// /* Generate AI routine when button clicked */
// generateRoutineBtn.addEventListener("click", async () => {
//   if (selectedProducts.length === 0) {
//     alert("Please select at least one product first.");
//     return;
//   }

//   const prompt = `
// I have selected the following skincare products from L’Oréal:
// ${selectedProducts
//   .map(
//     (p, i) =>
//       `${i + 1}. ${p.name} by ${p.brand} - ${p.category}\nDescription: ${p.description}`
//   )
//   .join("\n")}

// Can you create a personalized skincare routine using these products?
// Please explain when and how to use each one.
// `;

//   // Show user input in chat window
//   chatWindow.innerHTML += `
//     <div class="chat-message user">
//       <strong>You:</strong> ${prompt.replace(/\n/g, "<br>")}
//     </div>
//   `;

//   // Show loading...
//   chatWindow.innerHTML += `
//     <div class="chat-message bot loading">
//       <strong>AI:</strong> Thinking...
//     </div>
//   `;
//   chatWindow.scrollTop = chatWindow.scrollHeight;

//   try {
//     const res = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${apiKey}`,
//       },
//       body: JSON.stringify({
//         model: "gpt-3.5-turbo",
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0.7,
//       }),
//     });

//     const data = await res.json();
//     const reply = data.choices?.[0]?.message?.content || "No response.";

//     // Replace loading with actual reply
//     document.querySelector(".chat-message.bot.loading").remove();
//     chatWindow.innerHTML += `
//       <div class="chat-message bot">
//         <strong>AI:</strong> ${reply.replace(/\n/g, "<br>")}
//       </div>
//     `;
//     chatWindow.scrollTop = chatWindow.scrollHeight;
//   } catch (err) {
//     document.querySelector(".chat-message.bot.loading").remove();
//     chatWindow.innerHTML += `
//       <div class="chat-message bot error">
//         <strong>AI:</strong> Sorry, there was an error connecting to OpenAI.
//       </div>
//     `;
//     console.error(err);
//   }
// });

// /* Chatbot form default behavior (optional) */
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   alert("Please use the 'Generate Routine' button instead.");
// });

// // Initialize conversation history for follow-ups
// let conversationMessages = [
//   {
//     role: "system",
//     content:
//       "You are a professional beauty consultant helping with skincare, haircare, makeup, fragrance, and product routines. Stay focused on L’Oréal products and related beauty advice only.",
//   },
// ];

// // Replace this after generateRoutineBtn.addEventListener(...)
// chatForm.addEventListener("submit", async (e) => {
//   e.preventDefault();

//   const userInput = document.getElementById("userInput").value.trim();
//   if (!userInput) return;

//   // Add user message to UI
//   chatWindow.innerHTML += `
//     <div class="chat-message user">
//       <strong>You:</strong> ${userInput}
//     </div>
//   `;

//   // Add user message to conversation
//   conversationMessages.push({ role: "user", content: userInput });

//   // Show loading
//   chatWindow.innerHTML += `
//     <div class="chat-message bot loading">
//       <strong>AI:</strong> Thinking...
//     </div>
//   `;
//   chatWindow.scrollTop = chatWindow.scrollHeight;
//   document.getElementById("userInput").value = "";

//   try {
//     const res = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${apiKey}`,
//       },
//       body: JSON.stringify({
//         model: "gpt-3.5-turbo",
//         messages: conversationMessages,
//         temperature: 0.7,
//       }),
//     });

//     const data = await res.json();
//     const reply = data.choices?.[0]?.message?.content || "No response.";

//     // Add AI message to history
//     conversationMessages.push({ role: "assistant", content: reply });

//     // Replace loading with reply
//     document.querySelector(".chat-message.bot.loading").remove();
//     chatWindow.innerHTML += `
//       <div class="chat-message bot">
//         <strong>AI:</strong> ${reply.replace(/\n/g, "<br>")}
//       </div>
//     `;
//     chatWindow.scrollTop = chatWindow.scrollHeight;
//   } catch (err) {
//     document.querySelector(".chat-message.bot.loading").remove();
//     chatWindow.innerHTML += `
//       <div class="chat-message bot error">
//         <strong>AI:</strong> Something went wrong.
//       </div>
//     `;
//     console.error(err);
//   }
// });

// //working ok  LATEST//

// /* Get references to DOM elements */
// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const selectedProductsList = document.getElementById("selectedProductsList");
// const generateRoutineBtn = document.getElementById("generateRoutine");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");

// /* Initialize selected products array */
// let selectedProducts = [];

// /* Show initial placeholder */
// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// /* Load product data from JSON file */
// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// /* Display product cards with hover overlay */
// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//       <div class="product-card" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <div class="product-info">
//           <h3>${product.name}</h3>
//           <p>${product.brand}</p>
//         </div>
//         <div class="product-overlay">
//           <p>${product.description}</p>
//         </div>
//       </div>
//     `
//     )
//     .join("");

//   // Add click event to each product card for selection
//   const cards = document.querySelectorAll(".product-card");
//   cards.forEach((card) => {
//     card.addEventListener("click", () => {
//       const productId = parseInt(card.getAttribute("data-id"));
//       const selectedProduct = products.find((p) => p.id === productId);
//       toggleProductSelection(selectedProduct);
//     });
//   });

//   highlightSelectedCards();
// }

// /* Toggle selection of a product */
// function toggleProductSelection(product) {
//   const index = selectedProducts.findIndex((p) => p.id === product.id);
//   if (index === -1) {
//     selectedProducts.push(product);
//   } else {
//     selectedProducts.splice(index, 1);
//   }
//   updateSelectedProductsUI();
//   highlightSelectedCards();
// }

// /* Update the Selected Products section */
// function updateSelectedProductsUI() {
//   selectedProductsList.innerHTML = selectedProducts
//     .map(
//       (product) => `
//       <div class="selected-item" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <span class="remove-btn" title="Remove">×</span>
//       </div>
//     `
//     )
//     .join("");

//   // Remove button click
//   const removeButtons = document.querySelectorAll(".remove-btn");
//   removeButtons.forEach((button) => {
//     button.addEventListener("click", (e) => {
//       e.stopPropagation(); // Prevent card click
//       const productId = parseInt(button.parentElement.getAttribute("data-id"));
//       selectedProducts = selectedProducts.filter((p) => p.id !== productId);
//       updateSelectedProductsUI();
//       highlightSelectedCards();
//     });
//   });
// }

// /* Visually highlight selected cards */
// function highlightSelectedCards() {
//   const productCards = document.querySelectorAll(".product-card");
//   productCards.forEach((card) => {
//     const productId = parseInt(card.getAttribute("data-id"));
//     const isSelected = selectedProducts.some((p) => p.id === productId);
//     card.classList.toggle("selected", isSelected);
//   });
// }

// /* Filter and display products by category */
// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );
//   displayProducts(filteredProducts);
// });

// /* Placeholder for chatbot form */
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
// });

//Working ok//

// /* Get references to DOM elements */
// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const selectedProductsList = document.getElementById("selectedProductsList");
// const generateRoutineBtn = document.getElementById("generateRoutine");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");

// /* Initialize selected products array */
// let selectedProducts = [];

// /* Show initial placeholder */
// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// /* Load product data from JSON file */
// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// /* Create HTML for displaying product cards with hover overlay */
// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//       <div class="product-card" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <div class="product-info">
//           <h3>${product.name}</h3>
//           <p>${product.brand}</p>
//         </div>
//         <div class="product-overlay">
//           <p>${product.description}</p>
//         </div>
//       </div>
//     `
//     )
//     .join("");

//   // Add click event to each product card for selection
//   const cards = document.querySelectorAll(".product-card");
//   cards.forEach((card) => {
//     card.addEventListener("click", () => {
//       const productId = parseInt(card.getAttribute("data-id"));
//       const selectedProduct = products.find((p) => p.id === productId);
//       toggleProductSelection(selectedProduct);
//     });
//   });

//   highlightSelectedCards();
// }

// /* Toggle selection of a product */
// function toggleProductSelection(product) {
//   const index = selectedProducts.findIndex((p) => p.id === product.id);
//   if (index === -1) {
//     selectedProducts.push(product);
//   } else {
//     selectedProducts.splice(index, 1);
//   }
//   updateSelectedProductsUI();
//   highlightSelectedCards();
// }

// /* Update the Selected Products section */
// function updateSelectedProductsUI() {
//   selectedProductsList.innerHTML = selectedProducts
//     .map(
//       (product) => `
//       <div class="selected-item" data-id="${product.id}" title="Click to remove">
//         <img src="${product.image}" alt="${product.name}">
//       </div>
//     `
//     )
//     .join("");

//   // Click to remove item from selected list
//   const thumbnails = document.querySelectorAll(".selected-item");
//   thumbnails.forEach((thumb) => {
//     thumb.addEventListener("click", () => {
//       const productId = parseInt(thumb.getAttribute("data-id"));
//       selectedProducts = selectedProducts.filter((p) => p.id !== productId);
//       updateSelectedProductsUI();
//       highlightSelectedCards();
//     });
//   });
// }

// /* Visually highlight selected cards */
// function highlightSelectedCards() {
//   const productCards = document.querySelectorAll(".product-card");
//   productCards.forEach((card) => {
//     const productId = parseInt(card.getAttribute("data-id"));
//     const isSelected = selectedProducts.some((p) => p.id === productId);
//     if (isSelected) {
//       card.classList.add("selected");
//     } else {
//       card.classList.remove("selected");
//     }
//   });
// }

// /* Filter and display products by category */
// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );
//   displayProducts(filteredProducts);
// });

// /* Placeholder for chatbot form */
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
// });

////BAD Description///

// /* Get references to DOM elements */
// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const selectedProductsList = document.getElementById("selectedProductsList");
// const generateRoutineBtn = document.getElementById("generateRoutine");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");

// /* Initialize selected products array */
// let selectedProducts = [];

// /* Show initial placeholder */
// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// /* Load product data from JSON file */
// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// /* Create HTML for displaying product cards */
// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//       <div class="product-card" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <div class="product-info">
//           <h3>${product.name}</h3>
//           <p>${product.brand}</p>
//         </div>
//         <div class="product-description">${product.description}</div>
//       </div>
//     `
//     )
//     .join("");

//   // Add click event to each product card
//   const cards = document.querySelectorAll(".product-card");
//   cards.forEach((card) => {
//     card.addEventListener("click", () => {
//       const productId = parseInt(card.getAttribute("data-id"));
//       const selectedProduct = products.find((p) => p.id === productId);
//       toggleProductSelection(selectedProduct);
//     });

//     // Toggle description visibility
//     const infoSection = card.querySelector(".product-info");
//     infoSection.addEventListener("click", (e) => {
//       e.stopPropagation(); // prevent triggering card select
//       const desc = card.querySelector(".product-description");
//       desc.classList.toggle("visible");
//     });
//   });

//   highlightSelectedCards();
// }

// /* Toggle selection of a product */
// function toggleProductSelection(product) {
//   const index = selectedProducts.findIndex((p) => p.id === product.id);
//   if (index === -1) {
//     selectedProducts.push(product);
//   } else {
//     selectedProducts.splice(index, 1);
//   }
//   updateSelectedProductsUI();
//   highlightSelectedCards();
// }

// /* Update the Selected Products section */
// function updateSelectedProductsUI() {
//   selectedProductsList.innerHTML = selectedProducts
//     .map(
//       (product) => `
//       <div class="selected-item" data-id="${product.id}" title="Click to remove">
//         <img src="${product.image}" alt="${product.name}">
//       </div>
//     `
//     )
//     .join("");

//   // Add click event to each selected item thumbnail
//   const thumbnails = document.querySelectorAll(".selected-item");
//   thumbnails.forEach((thumb) => {
//     thumb.addEventListener("click", () => {
//       const productId = parseInt(thumb.getAttribute("data-id"));
//       selectedProducts = selectedProducts.filter((p) => p.id !== productId);
//       updateSelectedProductsUI();
//       highlightSelectedCards();
//     });
//   });
// }

// /* Add border to selected product cards */
// function highlightSelectedCards() {
//   const productCards = document.querySelectorAll(".product-card");
//   productCards.forEach((card) => {
//     const productId = parseInt(card.getAttribute("data-id"));
//     const isSelected = selectedProducts.some((p) => p.id === productId);
//     if (isSelected) {
//       card.classList.add("selected");
//     } else {
//       card.classList.remove("selected");
//     }
//   });
// }

// /* Filter and display products by category */
// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );
//   displayProducts(filteredProducts);
// });

// /* Placeholder: Chat submission (to be upgraded later) */
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
// });

///UPDATE: This code has been refactored to include product selection and display functionality, as well as a chat interface. The original placeholder functionality has been enhanced to allow users to select products and view them dynamically based on category selection.

// /* Get references to DOM elements */
// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const selectedProductsList = document.getElementById("selectedProductsList");
// const generateRoutineBtn = document.getElementById("generateRoutine");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");

// /* Initialize selected products array */
// let selectedProducts = [];

// /* Show initial placeholder */
// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// /* Load product data from JSON file */
// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// /* Create HTML for displaying product cards */
// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//       <div class="product-card" data-id="${product.id}">
//         <img src="${product.image}" alt="${product.name}">
//         <div class="product-info">
//           <h3>${product.name}</h3>
//           <p>${product.brand}</p>
//         </div>
//       </div>
//     `
//     )
//     .join("");

//   // Add click event to each product card
//   const cards = document.querySelectorAll(".product-card");
//   cards.forEach((card) => {
//     card.addEventListener("click", () => {
//       const productId = parseInt(card.getAttribute("data-id"));
//       const selectedProduct = products.find((p) => p.id === productId);
//       toggleProductSelection(selectedProduct);
//     });
//   });

//   highlightSelectedCards();
// }

// /* Toggle selection of a product */
// function toggleProductSelection(product) {
//   const index = selectedProducts.findIndex((p) => p.id === product.id);
//   if (index === -1) {
//     selectedProducts.push(product);
//   } else {
//     selectedProducts.splice(index, 1);
//   }
//   updateSelectedProductsUI();
//   highlightSelectedCards();
// }

// /* Update the Selected Products section */
// function updateSelectedProductsUI() {
//   selectedProductsList.innerHTML = selectedProducts
//     .map(
//       (product) => `
//       <div class="selected-item" data-id="${product.id}" title="Click to remove">
//         <img src="${product.image}" alt="${product.name}">
//       </div>
//     `
//     )
//     .join("");

//   // Add click event to each selected item thumbnail
//   const thumbnails = document.querySelectorAll(".selected-item");
//   thumbnails.forEach((thumb) => {
//     thumb.addEventListener("click", () => {
//       const productId = parseInt(thumb.getAttribute("data-id"));
//       selectedProducts = selectedProducts.filter((p) => p.id !== productId);
//       updateSelectedProductsUI();
//       highlightSelectedCards();
//     });
//   });
// }

// /* Add border to selected product cards */
// function highlightSelectedCards() {
//   const productCards = document.querySelectorAll(".product-card");
//   productCards.forEach((card) => {
//     const productId = parseInt(card.getAttribute("data-id"));
//     const isSelected = selectedProducts.some((p) => p.id === productId);
//     if (isSelected) {
//       card.classList.add("selected");
//     } else {
//       card.classList.remove("selected");
//     }
//   });
// }

// /* Filter and display products by category */
// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );
//   displayProducts(filteredProducts);
// });

// /* Placeholder: Chat submission (to be upgraded later) */
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();
//   chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
// });

///ORIGINAL////

// /* Get references to DOM elements */
// const categoryFilter = document.getElementById("categoryFilter");
// const productsContainer = document.getElementById("productsContainer");
// const chatForm = document.getElementById("chatForm");
// const chatWindow = document.getElementById("chatWindow");

// /* Show initial placeholder until user selects a category */
// productsContainer.innerHTML = `
//   <div class="placeholder-message">
//     Select a category to view products
//   </div>
// `;

// /* Load product data from JSON file */
// async function loadProducts() {
//   const response = await fetch("products.json");
//   const data = await response.json();
//   return data.products;
// }

// /* Create HTML for displaying product cards */
// function displayProducts(products) {
//   productsContainer.innerHTML = products
//     .map(
//       (product) => `
//     <div class="product-card">
//       <img src="${product.image}" alt="${product.name}">
//       <div class="product-info">
//         <h3>${product.name}</h3>
//         <p>${product.brand}</p>
//       </div>
//     </div>
//   `
//     )
//     .join("");
// }

// /* Filter and display products when category changes */
// categoryFilter.addEventListener("change", async (e) => {
//   const products = await loadProducts();
//   const selectedCategory = e.target.value;

//   /* filter() creates a new array containing only products
//      where the category matches what the user selected */
//   const filteredProducts = products.filter(
//     (product) => product.category === selectedCategory
//   );

//   displayProducts(filteredProducts);
// });

// /* Chat form submission handler - placeholder for OpenAI integration */
// chatForm.addEventListener("submit", (e) => {
//   e.preventDefault();

//   chatWindow.innerHTML = "Connect to the OpenAI API for a response!";
// });
