import { Post } from '../entities/Post'
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql'
import { MyContext } from '../types'
import { isAuth } from '../middleware/isAuth'
import { getConnection } from 'typeorm'
import { Upvote } from '../entities/Upvote'

@InputType()
class PostInput {
  @Field()
  title: string
  @Field()
  text: string
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[]

  @Field()
  hasMore: boolean
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post) {
    if (root.text.length > 50) {
      return root.text.slice(0, 50) + '...'
    } else {
      return root.text
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const { userId } = req.session
    const realVal = value !== -1 ? 1 : -1

    const upvote = await Upvote.findOne({ where: { postId, userId } })

    // User has voted on post before
    if (upvote && upvote.value !== realVal) {
      await getConnection().transaction(async tm => {
        await tm.query(`
          update upvote
          set value = ${realVal}
          where "postId" = ${postId} and "userId" = ${userId};
        `)
        await tm.query(`
          update post
          set points = points + ${2 * realVal}
          where id = ${postId};
        `)
      })
    } else if (!upvote) {
      await getConnection().transaction(async tm => {
        await tm.query(`
          insert into upvote ("userId", "postId", "value")
          values (${userId}, ${postId}, ${realVal});
        `)

        await tm.query(`
          update post
          set points = points + ${realVal}
          where id = ${postId};
        `)
      })
    }

    return true
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() { req }: MyContext
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit)

    const replacements: any[] = [realLimit + 1]

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
    }

    // Undefined for some reason
    // console.log('giving posts to user', req.session.userId)

    const posts = await getConnection().query(
      `
    select p.*, 
    json_build_object(
      'id', u.id, 
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAt', u."updatedAt") creator,
      ${
        req.session.userId
          ? `
        (select value from upvote where "userId" = ${req.session.userId} and "postId" = p.id) "voteStatus"
 
        `
          : 'null as "voteStatus"'
      }
    from post p
    inner join public.user u on u.id = p."creatorId"
    ${cursor ? `where p."createdAt" < $2` : ''}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    )
    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimit + 1,
    }
  }

  @Query(() => Post, { nullable: true })
  post(@Arg('id', () => Int!) id: number): Promise<Post | undefined> {
    return Post.findOne(id, { relations: ['creator'] })
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({ ...input, creatorId: req.session.userId }).save()
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg('id', () => Int) id: number,
    @Arg('title') title: string,
    @Arg('text') text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning('*')
      .execute()

    return result.raw[0]
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg('id', () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    // const post = await Post.findOne(id)
    // if (!post) return false
    // if (post.creatorId !== req.session.userId) throw new Error('not authorized')

    await Post.delete({ id, creatorId: req.session.userId })
    return true
  }
}
