import Layout from "@/components/Layout/Layout";
import VideoCreationForm from "@/components/VideoCreationForm";

const Create = () => {
  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-purple to-neon-green bg-clip-text text-transparent">
            Create Video
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create videos using JSON parameters or manual configuration
          </p>
        </div>

        <VideoCreationForm />
      </div>
    </Layout>
  );
};

export default Create;