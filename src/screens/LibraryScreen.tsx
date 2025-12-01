import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useStore } from '../store';
import { LibraryStackParamList } from '../navigation/AppNavigator';
import type { PodcastShow } from '../types';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = StackNavigationProp<LibraryStackParamList, 'LibraryHome'>;

export default function LibraryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const showsMap = useStore((state) => state.shows);
  const shows = useMemo(() => Object.values(showsMap), [showsMap]);
  const { colors } = useTheme();

  const renderShow: ListRenderItem<PodcastShow> = ({ item }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', padding: 10, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 8 }}
      onPress={() => navigation.navigate('EpisodeList', { showId: item.id })}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} />
      ) : (
        <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: colors.border }} />
      )}
      <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.text }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }} numberOfLines={1}>
          {item.author}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Text style={{ fontSize: 30, fontWeight: 'bold', padding: 20, color: colors.text }}>My Podcasts</Text>
      {shows.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>No podcasts yet</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            Add a podcast from the Discover tab
          </Text>
        </View>
      ) : (
        <FlatList<PodcastShow>
          data={shows}
          renderItem={renderShow}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </SafeAreaView>
  );
}

