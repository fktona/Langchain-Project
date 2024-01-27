import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { createClient } from '@supabase/supabase-js'
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { RunnableSequence } from '@langchain/core/runnables';



type PromptTemplateInput<T, U> = {
  prompt: string;
  // Add other properties if needed
};

export default  function Home() {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    separators: ['\n', ' ', '.', ',', '!', '?', ';', ':', '(', ')', '[', ']', '{', '}', '<', '>', '"', "'"],
  });  

  const openAIApiKey = process.env.openAIApiKey;
  
  const llm = new ChatOpenAI({ openAIApiKey });

  const prompt: PromptTemplateInput<any, any> = {
    prompt: `Given a question covert it to a standalone question.
    question: {question}  standalone question`
  };

  const promptTemplate = PromptTemplate.fromTemplate(prompt.prompt);

  const answer=`You are a  helpfull chatbot provided with some information  about a document based on the context provided.
     You are asked to answer some questions about the story. always reply nicely and politely.
     context: {context} question: {question} answer:`
  const answerPromt = PromptTemplate.fromTemplate(answer);

  const grammer = `correct the given sentence.
    sentence: {sentence} corrected sentence:`

    const grammerPrompt = PromptTemplate.fromTemplate(grammer);

    const chain = RunnableSequence.from([grammerPrompt, llm, answerPromt, new StringOutputParser()])
  const embeddings = new OpenAIEmbeddings({ openAIApiKey });


   const sbUrl = process.env.supabaseUrl;
     const supabaseKey = process.env.supabaseKey;

      const client = createClient(sbUrl ?? '', supabaseKey ?? '');
   const load = async () => {
    const loader = new PDFLoader("public/story.pdf");

    const docs = await loader.load();
    //console.log('ghyh', docs)

    // await SupabaseVectorStore.fromDocuments(docs, 
    //   new OpenAIEmbeddings({ openAIApiKey }),{
    //     client,
    //     tableName: 'documents'
    //   });
    //   console.log('done')

    const vectorstores = new SupabaseVectorStore(embeddings,{
      client,
      tableName: 'documents',
      //queryName:'langchain query'
    });


    const combined = () => {
      const combined = docs.map((doc) => doc.pageContent).join('\n\n');
      return combined;
    }

    
    const  retrival =  vectorstores.asRetriever()
    // const ask  = await retrival.invoke('The Boscombe Valley Mystery');
    // console.log(ask);
    const result =  promptTemplate.pipe(llm).pipe(new StringOutputParser()).pipe(retrival).pipe(combined).pipe(answerPromt);
     const text = await result.invoke({  question: 'give the summary of the story' });
   console.log(text);
    
   
    //console.log(text);
   }

   

   const file = async () => {
  //   const filePath = path.join(process.cwd(), 'public', 'faith.txt');
  //   const fileContents = fs.readFileSync(filePath, 'utf8');
  //   const output = await splitter.createDocuments([fileContents]);
  //   const embeddingsResult = await embeddings.embedQuery(fileContents)
    

    
  //   return fileContents;


   }

file();


    

  return load();
}
      