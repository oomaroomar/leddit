import { User } from '../entities/User'
import { MyContext } from 'src/types'
import argon2 from 'argon2'
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql'
import { Session } from 'express-session'
import { COOKIE_NAME } from '../constants'

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    if (!req.session.userId) {
      return null
    }

    const user = await em.findOne(User, { id: req.session.userId })
    return user
  }

  @Query(() => [User], { nullable: true })
  async allUsers(@Ctx() { em }: MyContext) {
    const users = await em.find(User, {})
    console.log(users)
    return users
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2)
      return {
        errors: [
          {
            field: 'username',
            message: 'username must be 2 characters or longer',
          },
        ],
      }
    if (options.password.length <= 3)
      return {
        errors: [
          {
            field: 'password',
            message: 'password must be 3 characters or longer',
          },
        ],
      }

    const hashedPassword = await argon2.hash(options.password)
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    })
    try {
      await em.persistAndFlush(user)
    } catch (err) {
      if (err.code === '23505')
        // duplicate username error
        // || err.detail.includes('already exists')
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        }
      console.log(err.message)
    }

    req.session.userId = user.id
    return {
      user,
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username })
    if (!user)
      return {
        errors: [
          {
            field: 'username',
            message: "username doesn't exist",
          },
        ],
      }
    const valid = await argon2.verify(user.password, options.password)
    if (!valid)
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      }

    req.session.userId = user.id
    console.log(req.session.userId)

    return {
      user,
    }
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise(resolve =>
      req.session.destroy(err => {
        res.clearCookie(COOKIE_NAME)
        if (err) {
          console.log(err)
          resolve(false)
          return
        }
        resolve(true)
      })
    )
  }
}

Session
