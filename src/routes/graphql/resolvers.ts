import DataLoader from 'dataloader';
import { parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import type {
  PrismaClient,
  User,
  SubscribersOnAuthors,
  Prisma,
  Profile,
  Post,
  MemberType
} from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import type { GraphQLResolveInfo } from 'graphql';

type UserWithSubscriptions = User & {
  userSubscribedTo?: SubscribersOnAuthors[];
  subscribedToUser?: SubscribersOnAuthors[];
};

export interface Context {
  prisma: PrismaClient;
  fastify: FastifyInstance;
  loaders: {
    userLoader: DataLoader<string, User | null>;
    profileLoader: DataLoader<string, Profile | null>;
    postsLoader: DataLoader<string, Post[]>;
    memberTypeLoader: DataLoader<string, MemberType | null>;
    userSubscriptionsLoader: DataLoader<string, User[]>;
    subscribedToUserLoader: DataLoader<string, User[]>;
  };
}

export const createLoaders = (prisma: PrismaClient) => {
  const userLoader = new DataLoader<string, User | null>(async (ids: readonly string[]) => {
    const users = await prisma.user.findMany({
      where: { id: { in: ids as string[] } },
    });
    return ids.map(id => users.find(user => user.id === id) || null);
  });

  const profileLoader = new DataLoader(async (ids: readonly string[]) => {
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: ids as string[] } },
    });
    return ids.map(id => profiles.find(profile => profile.userId === id) || null);
  });

  const postsLoader = new DataLoader(async (ids: readonly string[]) => {
    const posts = await prisma.post.findMany({
      where: { authorId: { in: ids as string[] } },
    });
    const postsByAuthor = ids.map(id => posts.filter(post => post.authorId === id));
    return postsByAuthor;
  });

  const memberTypeLoader = new DataLoader(async (ids: readonly string[]) => {
    const memberTypes = await prisma.memberType.findMany({
      where: { id: { in: ids as string[] } },
    });
    return ids.map(id => memberTypes.find(mt => mt.id === id) || null);
  });

  const userSubscriptionsLoader = new DataLoader<string, User[]>(async (ids: readonly string[]) => {
    const subscriptions = await prisma.subscribersOnAuthors.findMany({
      where: { subscriberId: { in: ids as string[] } },
      include: {
        author: true,
      },
    });
    return ids.map(id => {
      const userSubs = subscriptions.filter(sub => sub.subscriberId === id);
      return userSubs.map(sub => sub.author);
    });
  });

  const subscribedToUserLoader = new DataLoader<string, User[]>(async (ids: readonly string[]) => {
    const subscriptions = await prisma.subscribersOnAuthors.findMany({
      where: { authorId: { in: ids as string[] } },
      include: {
        subscriber: true,
      },
    });
    return ids.map(id => {
      const userSubs = subscriptions.filter(sub => sub.authorId === id);
      return userSubs.map(sub => sub.subscriber);
    });
  });

  return {
    userLoader,
    profileLoader,
    postsLoader,
    memberTypeLoader,
    userSubscriptionsLoader,
    subscribedToUserLoader,
  };
};

export const queryResolvers = {
  memberTypes: async (_: unknown, __: unknown, { prisma }: Context) => {
    return prisma.memberType.findMany();
  },
  memberType: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    return prisma.memberType.findUnique({ where: { id } });
  },
  users: async (
    _: unknown,
    __: unknown,
    { prisma, loaders }: Context,
    info: GraphQLResolveInfo
  ) => {
    const parsedInfo = parseResolveInfo(info) as ResolveTree;
    const fields = parsedInfo.fieldsByTypeName?.User || {};
    const needsUserSubscribedTo = 'userSubscribedTo' in fields;
    const needsSubscribedToUser = 'subscribedToUser' in fields;

    const users = await prisma.user.findMany({
      include: {
        userSubscribedTo: needsUserSubscribedTo,
        subscribedToUser: needsSubscribedToUser,
      },
    });

    for (const user of users) {
      loaders.userLoader.prime(user.id, user);

      if (needsUserSubscribedTo && user.userSubscribedTo) {
        const authorIds = user.userSubscribedTo.map(sub => sub.authorId);
        const authors = users.filter(u => authorIds.includes(u.id));
        loaders.userSubscriptionsLoader.prime(user.id, authors);
      }

      if (needsSubscribedToUser && user.subscribedToUser) {
        const subscriberIds = user.subscribedToUser.map(sub => sub.subscriberId);
        const subscribers = users.filter(u => subscriberIds.includes(u.id));
        loaders.subscribedToUserLoader.prime(user.id, subscribers);
      }
    }

    return users;
  },
  user: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    return prisma.user.findUnique({ where: { id } });
  },
  posts: async (_: unknown, __: unknown, { prisma }: Context) => {
    return prisma.post.findMany();
  },
  post: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    return prisma.post.findUnique({ where: { id } });
  },
  profiles: async (_: unknown, __: unknown, { prisma }: Context) => {
    return prisma.profile.findMany();
  },
  profile: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    return prisma.profile.findUnique({ where: { id } });
  },
};

export const typeResolvers = {
  User: {
    profile: async (parent: User, _: unknown, { loaders }: Context) => {
      return loaders.profileLoader.load(parent.id);
    },
    posts: async (parent: User, _: unknown, { loaders }: Context) => {
      return loaders.postsLoader.load(parent.id);
    },
    userSubscribedTo: async (parent: UserWithSubscriptions, _: unknown, { loaders }: Context) => {
      return loaders.userSubscriptionsLoader.load(parent.id);
    },
    subscribedToUser: async (parent: UserWithSubscriptions, _: unknown, { loaders }: Context) => {
      return loaders.subscribedToUserLoader.load(parent.id);
    },
  },
  Profile: {
    memberType: async (parent: { memberTypeId: string }, _: unknown, { loaders }: Context) => {
      return loaders.memberTypeLoader.load(parent.memberTypeId);
    },
  },
};

export const mutationResolvers = {
  createUser: async (
    _: unknown,
    { dto }: { dto: Prisma.UserCreateInput | Prisma.UserUncheckedCreateInput },
    { prisma }: Context
  ) => {
    return prisma.user.create({ data: dto });
  },
  createProfile: async (
    _: unknown,
    { dto }: { dto: Prisma.ProfileCreateInput | Prisma.ProfileUncheckedCreateInput },
    { prisma }: Context
  ) => {
    return prisma.profile.create({ data: dto });
  },
  createPost: async (
    _: unknown,
    { dto }: { dto: Prisma.PostCreateInput | Prisma.PostUncheckedCreateInput },
    { prisma }: Context
  ) => {
    return prisma.post.create({ data: dto });
  },
  changePost: async (
    _: unknown,
    { id, dto }: { id: string; dto: Prisma.PostUpdateInput | Prisma.PostUncheckedUpdateInput },
    { prisma }: Context
  ) => {
    return prisma.post.update({ where: { id }, data: dto });
  },
  changeProfile: async (
    _: unknown,
    { id, dto }: { id: string; dto: Prisma.ProfileUpdateInput | Prisma.ProfileUncheckedUpdateInput },
    { prisma }: Context
  ) => {
    return prisma.profile.update({ where: { id }, data: dto });
  },
  changeUser: async (
    _: unknown,
    { id, dto }: { id: string; dto: Prisma.UserUpdateInput | Prisma.UserUncheckedUpdateInput },
    { prisma }: Context
  ) => {
    return prisma.user.update({ where: { id }, data: dto });
  },
  deleteUser: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    await prisma.user.delete({ where: { id } });
    return 'User deleted successfully';
  },
  deletePost: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    await prisma.post.delete({ where: { id } });
    return 'Post deleted successfully';
  },
  deleteProfile: async (_: unknown, { id }: { id: string }, { prisma }: Context) => {
    await prisma.profile.delete({ where: { id } });
    return 'Profile deleted successfully';
  },
  subscribeTo: async (
    _: unknown,
    { userId, authorId }: { userId: string; authorId: string },
    { prisma }: Context
  ) => {
    await prisma.subscribersOnAuthors.create({
      data: {
        subscriberId: userId,
        authorId: authorId,
      },
    });
    return 'Subscription successful';
  },
  unsubscribeFrom: async (
    _: unknown,
    { userId, authorId }: { userId: string; authorId: string },
    { prisma }: Context
  ) => {
    await prisma.subscribersOnAuthors.delete({
      where: {
        subscriberId_authorId: {
          subscriberId: userId,
          authorId: authorId,
        },
      },
    });
    return 'Unsubscription successful';
  },
};
