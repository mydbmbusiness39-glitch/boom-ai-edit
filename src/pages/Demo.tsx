import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/Layout/Layout';
import { Video, Scissors, Upload, ArrowRight } from 'lucide-react';

const Demo = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-boom-primary via-boom-secondary to-boom-accent bg-clip-text text-transparent">
                BoomStudio
              </span>
              {' '}— Demo
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Quick look at the flow: record → auto-edit → publish
            </p>
          </div>

          {/* Video Demo */}
          <div className="mb-16">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src="https://www.youtube.com/embed/di95tk3jhxw?rel=0&modestbranding=1"
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="BoomStudio Demo Video"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="mb-16" />

          {/* Feature Flow */}
          <div className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-boom-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-boom-primary/20 transition-colors">
                    <Video className="h-8 w-8 text-boom-primary" />
                  </div>
                  <CardTitle className="text-xl">Record</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Capture raw clips. Noise reduction + auto levels.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-boom-secondary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-boom-secondary/20 transition-colors">
                    <Scissors className="h-8 w-8 text-boom-secondary" />
                  </div>
                  <CardTitle className="text-xl">Edit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    AI trims silence, adds captions, and scene cuts.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-boom-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-boom-accent/20 transition-colors">
                    <Upload className="h-8 w-8 text-boom-accent" />
                  </div>
                  <CardTitle className="text-xl">Publish</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Export verticals for Shorts/Reels/TikTok in 1 tap.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator className="mb-16" />

          {/* CTA */}
          <div className="text-center">
            <Button asChild size="lg" className="text-lg px-8 py-4">
              <Link to="/dashboard">
                Open App & Try a Template
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Demo;