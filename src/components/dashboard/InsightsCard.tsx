import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFleetInsights, FleetInsight } from '@/hooks/useFleetInsights';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Truck, 
  FileWarning, 
  Wrench,
  DollarSign,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const iconMap = {
  alert: AlertTriangle,
  trending: TrendingUp,
  clock: Clock,
  truck: Truck,
  file: FileWarning,
  wrench: Wrench,
  dollar: DollarSign,
};

const typeStyles = {
  critical: {
    badge: 'bg-status-critical/10 text-status-critical border-status-critical/20',
    icon: 'text-status-critical',
    bg: 'bg-gradient-to-r from-status-critical/5 to-transparent',
    border: 'border-l-status-critical',
  },
  warning: {
    badge: 'bg-status-warning/10 text-status-warning border-status-warning/20',
    icon: 'text-status-warning',
    bg: 'bg-gradient-to-r from-status-warning/5 to-transparent',
    border: 'border-l-status-warning',
  },
  info: {
    badge: 'bg-primary/10 text-primary border-primary/20',
    icon: 'text-primary',
    bg: 'bg-gradient-to-r from-primary/5 to-transparent',
    border: 'border-l-primary',
  },
  success: {
    badge: 'bg-status-ok/10 text-status-ok border-status-ok/20',
    icon: 'text-status-ok',
    bg: 'bg-gradient-to-r from-status-ok/5 to-transparent',
    border: 'border-l-status-ok',
  },
};

function InsightItem({ insight }: { insight: FleetInsight }) {
  const Icon = iconMap[insight.icon] || Lightbulb;
  const styles = typeStyles[insight.type];

  return (
    <div className={cn(
      "p-3 rounded-lg border-l-4 transition-all duration-200 hover:shadow-md",
      styles.bg,
      styles.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-background shadow-sm", styles.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{insight.title}</span>
            {insight.value && (
              <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                {insight.value}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {insight.description}
          </p>
          {insight.action && (
            <Link to={insight.action.route}>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 mt-1 text-xs"
              >
                {insight.action.label}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightsCard() {
  const { data: insights, isLoading } = useFleetInsights();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = insights?.filter(i => i.type === 'critical').length || 0;
  const warningCount = insights?.filter(i => i.type === 'warning').length || 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights Inteligentes
          </CardTitle>
          <div className="flex gap-1">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} críticos
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-status-warning text-white text-xs">
                {warningCount} alertas
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-2">
          <div className="space-y-2">
            {insights?.map(insight => (
              <InsightItem key={insight.id} insight={insight} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
