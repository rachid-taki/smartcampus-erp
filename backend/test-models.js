require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Note: l'API pour lister les modèles n'est pas directement exposée de manière simple 
    // dans toutes les versions du SDK, mais on peut faire un fetch direct à l'API REST Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    console.log("=== Modèles disponibles pour votre clé API ===");
    data.models.forEach(model => {
      // On n'affiche que les modèles qui supportent la génération de contenu
      if (model.supportedGenerationMethods.includes("generateContent")) {
        console.log(`- ${model.name.replace('models/', '')}`);
      }
    });
  } catch (error) {
    console.error("Erreur:", error);
  }
}

listModels();