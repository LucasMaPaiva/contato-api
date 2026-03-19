import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env a partir do diretório raiz do contato-api
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/contato";

async function cleanupIndexes() {
  console.log(`Conectando ao MongoDB: ${MONGO_URI}...`);
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado com sucesso!");

    // Obter a coleção diretamente via driver nativo para ignorar definições do Mongoose
    const collection = mongoose.connection.collection('gamestates');
    const indexes = await collection.indexes();
    
    console.log(`Índices atuais em 'gamestates':`, JSON.stringify(indexes, null, 2));

    const indexesToDrop = indexes.filter(idx => 
      idx.name !== '_id_' && 
      idx.name !== 'roomCode_1'
    );

    if (indexesToDrop.length === 0) {
      console.log("Nenhum índice extra para remover.");
    } else {
      for (const idx of indexesToDrop) {
        console.log(`Removendo índice: ${idx.name}...`);
        await collection.dropIndex(idx.name);
        console.log(`Índice ${idx.name} removido.`);
      }
    }

    console.log("\nLimpeza concluída com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("Erro durante a limpeza de índices:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupIndexes();
