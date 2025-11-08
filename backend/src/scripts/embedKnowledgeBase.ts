import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RAGService from '../services/ai/RAGService';
import { TrainingScenario, ToneGuidelines, Company } from '../models';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Knowledge Base Embedding Migration Script
 *
 * This script processes existing data and creates vector embeddings:
 * 1. Training scenarios (ideal responses, coaching notes, common mistakes)
 * 2. Tone guidelines (phrases to use, phrases to avoid, tone rules)
 * 3. Company information (products, services, pricing)
 *
 * Usage: npm run embed-knowledge-base
 */

interface MigrationStats {
  scenariosProcessed: number;
  guidelinesProcessed: number;
  companiesProcessed: number;
  totalDocumentsCreated: number;
  errors: number;
}

class KnowledgeBaseMigration {
  private stats: MigrationStats = {
    scenariosProcessed: 0,
    guidelinesProcessed: 0,
    companiesProcessed: 0,
    totalDocumentsCreated: 0,
    errors: 0,
  };

  /**
   * Embed training scenarios
   */
  async embedTrainingScenarios(): Promise<void> {
    try {
      logger.info('Starting training scenarios embedding...');

      const scenarios = await TrainingScenario.find({ isActive: true });
      logger.info(`Found ${scenarios.length} active training scenarios`);

      for (const scenario of scenarios) {
        try {
          // Process each sub-scenario in the training scenario
          for (const subScenario of scenario.scenarios) {
            // 1. Embed ideal response with context
            const idealResponseContent = `
Training Scenario: ${scenario.theme}
Category: ${scenario.category}
Day: ${scenario.day}

Scenario Title: ${subScenario.title}
Customer Message: ${subScenario.customerMessage}

IDEAL RESPONSE:
${subScenario.idealResponse}

COACHING NOTES:
${subScenario.coachingNotes.join('\n')}

TONE GUIDELINES:
${subScenario.toneGuidelines.join('\n')}

COMMON MISTAKES TO AVOID:
${subScenario.commonMistakes.join('\n')}
`.trim();

            await RAGService.ingestDocument({
              title: `${scenario.theme} - ${subScenario.title}`,
              content: idealResponseContent,
              services: ['ai_agent', 'whatsapp'],
              metadata: {
                source: 'scenario',
                category: scenario.category,
                scenarioId: (scenario._id as mongoose.Types.ObjectId).toString(),
                tags: [
                  scenario.category,
                  `day-${scenario.day}`,
                  'ideal-response',
                  scenario.theme.toLowerCase().replace(/\s+/g, '-'),
                ],
              },
            });

            // 2. Embed coaching notes as separate documents
            if (subScenario.coachingNotes.length > 0) {
              const coachingNotesContent = `
Coaching Notes for: ${subScenario.title}
Category: ${scenario.category}

${subScenario.coachingNotes.join('\n\n')}

Context: ${scenario.theme}
Customer Message: ${subScenario.customerMessage}
`.trim();

              await RAGService.ingestDocument({
                title: `Coaching: ${subScenario.title}`,
                content: coachingNotesContent,
                services: ['ai_agent', 'whatsapp'],
                metadata: {
                  source: 'scenario',
                  category: scenario.category,
                  scenarioId: (scenario._id as mongoose.Types.ObjectId).toString(),
                  tags: [scenario.category, 'coaching-notes', `day-${scenario.day}`],
                },
              });
            }

            // 3. Embed common mistakes
            if (subScenario.commonMistakes.length > 0) {
              const mistakesContent = `
Common Mistakes for: ${subScenario.title}
Category: ${scenario.category}

MISTAKES TO AVOID:
${subScenario.commonMistakes.join('\n\n')}

Context: ${scenario.theme}
Scenario: ${subScenario.customerMessage}
`.trim();

              await RAGService.ingestDocument({
                title: `Mistakes to Avoid: ${subScenario.title}`,
                content: mistakesContent,
                services: ['ai_agent', 'whatsapp'],
                metadata: {
                  source: 'scenario',
                  category: scenario.category,
                  scenarioId: (scenario._id as mongoose.Types.ObjectId).toString(),
                  tags: [scenario.category, 'common-mistakes', `day-${scenario.day}`],
                },
              });
            }

            this.stats.totalDocumentsCreated += 3;
          }

          this.stats.scenariosProcessed++;
          logger.info(
            `Processed scenario ${this.stats.scenariosProcessed}/${scenarios.length}: ${scenario.theme}`
          );
        } catch (error) {
          logger.error(`Error processing scenario ${scenario._id}:`, error);
          this.stats.errors++;
        }
      }

      logger.info(`Training scenarios embedding completed. Processed: ${this.stats.scenariosProcessed}`);
    } catch (error) {
      logger.error('Error in embedTrainingScenarios:', error);
      throw error;
    }
  }

  /**
   * Embed tone guidelines
   */
  async embedToneGuidelines(): Promise<void> {
    try {
      logger.info('Starting tone guidelines embedding...');

      const guidelines = await ToneGuidelines.find({ isActive: true });
      logger.info(`Found ${guidelines.length} active tone guidelines`);

      for (const guideline of guidelines) {
        try {
          const categoryName =
            guideline.category === 'phrases_to_use'
              ? 'Phrases to Use'
              : guideline.category === 'phrases_to_avoid'
              ? 'Phrases to Avoid'
              : 'Tone Rules';

          // Group items and create content
          const items = guideline.items
            .map((item, index) => {
              let itemText = `${index + 1}. ${item.text}`;

              if (item.explanation) {
                itemText += `\n   Explanation: ${item.explanation}`;
              }

              if (item.examples && item.examples.length > 0) {
                itemText += `\n   Examples:\n   - ${item.examples.join('\n   - ')}`;
              }

              return itemText;
            })
            .join('\n\n');

          const content = `
Sales Communication Guidelines
Category: ${categoryName}

${items}
`.trim();

          await RAGService.ingestDocument({
            title: `${categoryName} Guidelines`,
            content,
            services: ['ai_agent', 'whatsapp'],
            metadata: {
              source: 'guideline',
              category: guideline.category,
              tags: ['communication', 'tone', guideline.category],
            },
          });

          this.stats.guidelinesProcessed++;
          this.stats.totalDocumentsCreated++;

          logger.info(`Processed guideline: ${categoryName}`);
        } catch (error) {
          logger.error(`Error processing guideline ${guideline._id}:`, error);
          this.stats.errors++;
        }
      }

      logger.info(`Tone guidelines embedding completed. Processed: ${this.stats.guidelinesProcessed}`);
    } catch (error) {
      logger.error('Error in embedToneGuidelines:', error);
      throw error;
    }
  }

  /**
   * Embed company information
   */
  async embedCompanyInfo(): Promise<void> {
    try {
      logger.info('Starting company information embedding...');

      const companies = await Company.find({});
      logger.info(`Found ${companies.length} companies`);

      for (const company of companies) {
        try {
          // Create company profile document
          const companyContent = `
Company Profile
Name: ${company.name}
${company.domain ? `Domain: ${company.domain}` : ''}

Subscription Plan: ${company.subscription.plan}
Status: ${company.subscription.isActive ? 'Active' : 'Inactive'}

Settings:
- Maximum Users: ${company.settings.maxUsers}
- Training Duration: ${company.settings.trainingDuration} days
- Session Duration: ${company.settings.sessionDuration} minutes
`.trim();

          await RAGService.ingestDocument({
            title: `Company: ${company.name}`,
            content: companyContent,
            services: ['ai_agent', 'whatsapp'],
            metadata: {
              source: 'company',
              category: 'company-info',
              companyId: (company._id as mongoose.Types.ObjectId).toString(),
              tags: ['company-profile', company.subscription.plan],
            },
          });

          this.stats.companiesProcessed++;
          this.stats.totalDocumentsCreated++;

          logger.info(`Processed company: ${company.name}`);
        } catch (error) {
          logger.error(`Error processing company ${company._id}:`, error);
          this.stats.errors++;
        }
      }

      logger.info(`Company information embedding completed. Processed: ${this.stats.companiesProcessed}`);
    } catch (error) {
      logger.error('Error in embedCompanyInfo:', error);
      throw error;
    }
  }

  /**
   * Embed Troika Tech product information (hardcoded knowledge)
   */
  async embedTroikaTechInfo(): Promise<void> {
    try {
      logger.info('Starting Troika Tech product information embedding...');

      // Main product information
      const productInfo = `
Troika Tech - WhatsApp Marketing Platform

COMPANY OVERVIEW:
Troika Tech has been operating since 2014, serving 500+ clients with WhatsApp Marketing solutions.

CORE PRODUCT:
Troika Messenger - WhatsApp Marketing Platform for bulk messaging and customer engagement.

KEY FEATURES:
1. Bulk WhatsApp Messaging
2. Targeted customer database
3. CTA (Call-to-Action) buttons
4. Campaign analytics and reporting
5. API integration capabilities
6. 24/7 customer support

PRICING:
- Minimum Package: 1 lakh (100,000) messages
- Starting Price: Contact sales for current rates
- Custom pricing based on volume and features

TARGET AUDIENCE:
- E-commerce businesses
- Real estate companies
- Educational institutions
- Healthcare providers
- Retail businesses
- Any business looking for direct customer engagement

NOTABLE CLIENTS:
- Lodha Group (Real Estate)
- Raymond (Apparel)
- Various e-commerce and retail brands

COMPETITIVE ADVANTAGES:
1. High delivery rates (90%+ typical)
2. Direct customer engagement
3. Rich media support (images, videos, documents)
4. Personalization capabilities
5. Compliance with WhatsApp Business API guidelines
6. Dedicated account management

USE CASES:
- Promotional campaigns
- Order notifications
- Customer support
- Appointment reminders
- Lead generation
- Product launches
- Festival offers
- Abandoned cart recovery
`.trim();

      await RAGService.ingestDocument({
        title: 'Troika Tech WhatsApp Marketing Platform',
        content: productInfo,
        services: ['ai_agent', 'whatsapp'],
        metadata: {
          source: 'company',
          category: 'product-info',
          tags: ['troika-tech', 'products', 'pricing', 'features'],
        },
      });

      // Sales objection handlers
      const objectionHandlers = `
Common Objections and Responses for Troika Tech Products

OBJECTION 1: "The pricing is too high"
RESPONSE: "I understand budget is important. Consider this - with 1 lakh messages reaching customers directly on WhatsApp (90%+ open rates), you're getting much better ROI than email (20% open rate) or SMS (limited engagement). The minimum package works out to a very cost-effective per-message rate for your business. Which cities are you targeting first?"

OBJECTION 2: "We already use email/SMS"
RESPONSE: "That's great! WhatsApp works alongside your existing channels. The key difference - WhatsApp has 90%+ open rates vs 20% for email. Plus, customers prefer WhatsApp for quick, direct communication. Many clients use email for detailed info and WhatsApp for time-sensitive offers. Would you like to see how both can work together?"

OBJECTION 3: "We don't have a database"
RESPONSE: "No problem! We help with that too. We can provide targeted databases based on your industry and location. Our clients like Lodha and Raymond started similarly. We'll work with you to build the right customer list. What's your target customer profile?"

OBJECTION 4: "Isn't WhatsApp bulk messaging banned?"
RESPONSE: "Great question! We use WhatsApp Business API - fully compliant and authorized. It's different from using personal WhatsApp for bulk messaging (which is banned). We ensure your campaigns follow all WhatsApp guidelines. Your business stays completely protected."

OBJECTION 5: "We need to think about it"
RESPONSE: "Of course! Smart to think it through. Let me quickly share - many clients saw 30-40% higher engagement in their first campaign itself. Since we're in the festival season, early movers get the best results. How about we schedule a quick 15-minute demo? You'll see exactly how it works for your business."

OBJECTION 6: "We had a bad experience with another provider"
RESPONSE: "I hear you. That's exactly why 500+ clients trust us since 2014. We offer dedicated support, transparent reporting, and guaranteed delivery rates. Plus, we work with big names like Lodha and Raymond - they chose us for reliability. Let's start with a small campaign so you can see the difference yourself?"
`.trim();

      await RAGService.ingestDocument({
        title: 'Sales Objection Handlers - Troika Tech',
        content: objectionHandlers,
        services: ['ai_agent', 'whatsapp'],
        metadata: {
          source: 'manual',
          category: 'objection_handling',
          tags: ['objections', 'sales-responses', 'troika-tech'],
        },
      });

      this.stats.totalDocumentsCreated += 2;

      logger.info('Troika Tech product information embedding completed');
    } catch (error) {
      logger.error('Error in embedTroikaTechInfo:', error);
      throw error;
    }
  }

  /**
   * Run complete migration
   */
  async migrate(): Promise<void> {
    try {
      const startTime = Date.now();

      logger.info('==============================================');
      logger.info('Starting Knowledge Base Migration');
      logger.info('==============================================\n');

      // Connect to MongoDB
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI not found in environment variables');
      }

      await mongoose.connect(mongoUri);
      logger.info('Connected to MongoDB\n');

      // Run migrations in sequence
      await this.embedTrainingScenarios();
      await this.embedToneGuidelines();
      await this.embedCompanyInfo();
      await this.embedTroikaTechInfo();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info('\n==============================================');
      logger.info('Migration Completed Successfully!');
      logger.info('==============================================');
      logger.info('Statistics:');
      logger.info(`  - Training Scenarios: ${this.stats.scenariosProcessed}`);
      logger.info(`  - Tone Guidelines: ${this.stats.guidelinesProcessed}`);
      logger.info(`  - Companies: ${this.stats.companiesProcessed}`);
      logger.info(`  - Total Documents Created: ${this.stats.totalDocumentsCreated}`);
      logger.info(`  - Errors: ${this.stats.errors}`);
      logger.info(`  - Duration: ${duration} seconds`);
      logger.info('==============================================\n');

      // Disconnect
      await mongoose.disconnect();
      logger.info('Disconnected from MongoDB');

      process.exit(0);
    } catch (error) {
      logger.error('Migration failed:', error);
      await mongoose.disconnect();
      process.exit(1);
    }
  }
}

// Run migration
const migration = new KnowledgeBaseMigration();
migration.migrate();
