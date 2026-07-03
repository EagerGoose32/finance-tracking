import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WatchlistScreen } from "../screens/WatchlistScreen";
import { CompanyDetailScreen } from "../screens/CompanyDetailScreen";
import { FilingDiffScreen } from "../screens/FilingDiffScreen";
import { AlertsScreen } from "../screens/AlertsScreen";

export type RootStackParamList = {
  Watchlist: undefined;
  CompanyDetail: { companyId: string; ticker: string };
  FilingDiff: { companyId: string; filingId: string };
  Alerts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Watchlist">
        <Stack.Screen name="Watchlist" component={WatchlistScreen} options={{ title: "Watchlist" }} />
        <Stack.Screen
          name="CompanyDetail"
          component={CompanyDetailScreen}
          options={({ route }) => ({ title: route.params.ticker })}
        />
        <Stack.Screen name="FilingDiff" component={FilingDiffScreen} options={{ title: "Filing Diff" }} />
        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: "Alerts" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
