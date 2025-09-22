const mongoose = require('mongoose');
const DemoRequest = require('../models/DemoRequest');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Alpaoumarbarry:Alpha.o.b5@cluster0.nokkhsj.mongodb.net/afrigest';

async function checkDemoRequests() {
    try {
        console.log('🔌 Connexion à MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        console.log('\n📋 Vérification des demandes de démo...');
        
        const demoRequests = await DemoRequest.find()
            .sort({ createdAt: -1 })
            .limit(10);

        if (demoRequests.length === 0) {
            console.log('❌ Aucune demande de démo trouvée');
        } else {
            console.log(`✅ ${demoRequests.length} demande(s) de démo trouvée(s):\n`);
            
            demoRequests.forEach((request, index) => {
                console.log(`${index + 1}. ${request.fullName} (${request.company})`);
                console.log(`   📧 Email: ${request.email}`);
                console.log(`   📞 Téléphone: ${request.phone}`);
                console.log(`   🏢 Type: ${request.businessType}`);
                console.log(`   🏪 Boutiques: ${request.storeCount}`);
                console.log(`   📅 Date: ${request.createdAt.toLocaleDateString('fr-FR')}`);
                console.log(`   📊 Statut: ${request.status}`);
                if (request.message) {
                    console.log(`   💬 Message: ${request.message.substring(0, 100)}...`);
                }
                console.log('');
            });
        }

        // Statistiques
        const stats = await DemoRequest.getStatistics();
        console.log('📊 STATISTIQUES:');
        console.log(`   • Total: ${stats.total}`);
        console.log(`   • Nouvelles: ${stats.newRequests}`);
        console.log(`   • Contactées: ${stats.contacted}`);
        console.log(`   • Démo programmée: ${stats.demoScheduled}`);
        console.log(`   • Converties: ${stats.converted}`);
        console.log(`   • Taux de conversion: ${stats.conversionRate}%`);

    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Déconnecté de MongoDB');
    }
}

// Exécution du script
checkDemoRequests();
