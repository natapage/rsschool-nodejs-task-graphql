import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull } from 'graphql';
import {
  MemberType,
  MemberTypeIdEnum,
  Post,
  Profile,
  User,
  CreateUserInput,
  ChangeUserInput,
  CreateProfileInput,
  ChangeProfileInput,
  CreatePostInput,
  ChangePostInput,
} from './types/schema.js';
import { UUIDType } from './types/uuid.js';
import { queryResolvers, mutationResolvers, typeResolvers } from './resolvers.js';

const RootQueryType = new GraphQLObjectType({
  name: 'RootQueryType',
  fields: {
    memberTypes: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(MemberType))),
      resolve: queryResolvers.memberTypes,
    },
    memberType: {
      type: MemberType,
      args: {
        id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
      },
      resolve: queryResolvers.memberType,
    },
    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
      resolve: queryResolvers.users,
    },
    user: {
      type: User as GraphQLObjectType,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: queryResolvers.user,
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
      resolve: queryResolvers.posts,
    },
    post: {
      type: Post,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: queryResolvers.post,
    },
    profiles: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Profile))),
      resolve: queryResolvers.profiles,
    },
    profile: {
      type: Profile,
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: queryResolvers.profile,
    },
  },
});

const Mutations = new GraphQLObjectType({
  name: 'Mutations',
  fields: {
    createUser: {
      type: new GraphQLNonNull(User),
      args: {
        dto: { type: new GraphQLNonNull(CreateUserInput) },
      },
      resolve: mutationResolvers.createUser,
    },
    createProfile: {
      type: new GraphQLNonNull(Profile),
      args: {
        dto: { type: new GraphQLNonNull(CreateProfileInput) },
      },
      resolve: mutationResolvers.createProfile,
    },
    createPost: {
      type: new GraphQLNonNull(Post),
      args: {
        dto: { type: new GraphQLNonNull(CreatePostInput) },
      },
      resolve: mutationResolvers.createPost,
    },
    changePost: {
      type: new GraphQLNonNull(Post),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangePostInput) },
      },
      resolve: mutationResolvers.changePost,
    },
    changeProfile: {
      type: new GraphQLNonNull(Profile),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeProfileInput) },
      },
      resolve: mutationResolvers.changeProfile,
    },
    changeUser: {
      type: new GraphQLNonNull(User),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
        dto: { type: new GraphQLNonNull(ChangeUserInput) },
      },
      resolve: mutationResolvers.changeUser,
    },
    deleteUser: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: mutationResolvers.deleteUser,
    },
    deletePost: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: mutationResolvers.deletePost,
    },
    deleteProfile: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        id: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: mutationResolvers.deleteProfile,
    },
    subscribeTo: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: mutationResolvers.subscribeTo,
    },
    unsubscribeFrom: {
      type: new GraphQLNonNull(GraphQLString),
      args: {
        userId: { type: new GraphQLNonNull(UUIDType) },
        authorId: { type: new GraphQLNonNull(UUIDType) },
      },
      resolve: mutationResolvers.unsubscribeFrom,
    },
  },
});

export const schema = new GraphQLSchema({
  types: [MemberTypeIdEnum],
  query: RootQueryType,
  mutation: Mutations,
});
const UserType = User as GraphQLObjectType;
const ProfileType = Profile ;

Object.assign(UserType.getFields().profile, {
  resolve: typeResolvers.User.profile,
});

Object.assign(UserType.getFields().posts, {
  resolve: typeResolvers.User.posts,
});

Object.assign(UserType.getFields().userSubscribedTo, {
  resolve: typeResolvers.User.userSubscribedTo,
});

Object.assign(UserType.getFields().subscribedToUser, {
  resolve: typeResolvers.User.subscribedToUser,
});

Object.assign(ProfileType.getFields().memberType, {
  resolve: typeResolvers.Profile.memberType,
});
