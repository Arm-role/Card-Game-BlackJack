using NUnit.Framework;
using System;

namespace Blackjack.Tests
{
  // ==========================================
  // 1. Card Tests: ทดสอบการคำนวณค่าของไพ่แต่ละใบ
  // ==========================================
  [TestFixture]
  public class CardTests
  {
    [TestCase(Rank.Two, 2)]
    [TestCase(Rank.Seven, 7)]
    [TestCase(Rank.Ten, 10)]
    [TestCase(Rank.Jack, 10)]
    [TestCase(Rank.Queen, 10)]
    [TestCase(Rank.King, 10)]
    [TestCase(Rank.Ace, 11)] // Ace ใบเดียวมีค่า 11
    public void GetValue_ShouldReturnCorrectValue(Rank rank, int expectedValue)
    {
      var card = new Card { Rank = rank, Suit = Suit.Spades };
      Assert.That(card.GetValue(), Is.EqualTo(expectedValue));
    }
  }

  // ==========================================
  // 2. Hand Tests: ทดสอบการรวมแต้มไพ่ในมือและการลดค่า Ace
  // ==========================================
  [TestFixture]
  public class HandTests
  {
    [Test]
    public void GetBestValue_NoAces_ShouldSumNormally()
    {
      var hand = new Hand();
      hand.Add(new Card { Rank = Rank.Ten });
      hand.Add(new Card { Rank = Rank.Seven });

      Assert.That(hand.GetBestValue(), Is.EqualTo(17));
      Assert.That(hand.IsBust(), Is.False);
    }

    [Test]
    public void GetBestValue_WithOneAce_Under21_ShouldCountAceAs11()
    {
      var hand = new Hand();
      hand.Add(new Card { Rank = Rank.Ace });
      hand.Add(new Card { Rank = Rank.Nine });

      Assert.That(hand.GetBestValue(), Is.EqualTo(20));
    }

    [Test]
    public void GetBestValue_WithOneAce_Over21_ShouldCountAceAs1()
    {
      var hand = new Hand();
      hand.Add(new Card { Rank = Rank.Ten });
      hand.Add(new Card { Rank = Rank.Eight });
      hand.Add(new Card { Rank = Rank.Ace }); // ถ้าเป็น 11 จะรวมได้ 29 (Bust) ต้องลดเหลือ 1

      Assert.That(hand.GetBestValue(), Is.EqualTo(19));
      Assert.That(hand.IsBust(), Is.False);
    }

    [Test]
    public void GetBestValue_WithMultipleAces_ShouldOptimizeCorrectly()
    {
      var hand = new Hand();
      hand.Add(new Card { Rank = Rank.Ace }); // 11
      hand.Add(new Card { Rank = Rank.Ace }); // 1 (รวม 12)
      hand.Add(new Card { Rank = Rank.Ten }); // + 10 (รวม 22 -> Ace ใบแรกต้องลดเหลือ 1 -> รวม 12)

      Assert.That(hand.GetBestValue(), Is.EqualTo(12));
      Assert.That(hand.IsBust(), Is.False);
    }

    [Test]
    public void IsBust_ShouldReturnTrue_WhenOver21()
    {
      var hand = new Hand();
      hand.Add(new Card { Rank = Rank.Ten });
      hand.Add(new Card { Rank = Rank.Ten });
      hand.Add(new Card { Rank = Rank.Two });

      Assert.That(hand.GetBestValue(), Is.EqualTo(22));
      Assert.That(hand.IsBust(), Is.True);
    }
  }

  // ==========================================
  // 3. BlackjackGame Tests: ทดสอบ Flow ของเกม (Hit, Stand, Dealer Logic)
  // ==========================================
  [TestFixture]
  public class BlackjackGameTests
  {
    [Test]
    public void StartGame_ShouldDealTwoCardsToEveryone()
    {
      var fakeDeck = new FakeDeck(new[]
      {
          new Card { Rank = Rank.Two },   // Player 1 Card 1
          new Card { Rank = Rank.Three }, // Player 1 Card 2
          new Card { Rank = Rank.Four },  // Dealer Card 1
          new Card { Rank = Rank.Five }   // Dealer Card 2
      });

      var game = new BlackjackGame(fakeDeck);
      game.AddPlayer(1);
      game.StartGame();

      Assert.That(game.Players[0].Hand.Cards.Count, Is.EqualTo(2));
      Assert.That(game.Dealer.Hand.Cards.Count, Is.EqualTo(2));
      Assert.That(game.Players[0].Hand.GetBestValue(), Is.EqualTo(5)); // 2 + 3
    }

    [Test]
    public void Hit_ShouldGiveOneCardToPlayer()
    {
      var fakeDeck = new FakeDeck(new[]
      {
          new Card { Rank = Rank.Two },   // P1
          new Card { Rank = Rank.Two },   // P1
          new Card { Rank = Rank.Two },   // Dealer
          new Card { Rank = Rank.Two },   // Dealer
          new Card { Rank = Rank.Ten }    // Card for Hit
      });

      var game = new BlackjackGame(fakeDeck);
      game.AddPlayer(1);
      game.StartGame(); // P1 มี 2 ใบ

      var hitCard = game.Hit(1); // ขอจั่ว 1 ใบ

      Assert.That(hitCard.Rank, Is.EqualTo(Rank.Ten));
      Assert.That(game.Players[0].Hand.Cards.Count, Is.EqualTo(3));
      Assert.That(game.Players[0].Hand.GetBestValue(), Is.EqualTo(14)); // 2 + 2 + 10
    }

    [Test]
    public void DealerPlay_ShouldStand_IfScoreIs17OrMore()
    {
      var fakeDeck = new FakeDeck(new[]
      {
          new Card { Rank = Rank.Two },   // P1
          new Card { Rank = Rank.Two },   // P1
          new Card { Rank = Rank.Ten },   // Dealer Card 1
          new Card { Rank = Rank.Seven }, // Dealer Card 2 (รวม 17)
          new Card { Rank = Rank.Two }    // ไม่ควรถูกจั่ว
      });

      var game = new BlackjackGame(fakeDeck);
      game.AddPlayer(1);
      game.StartGame();

      game.DealerPlay(); // Dealer เล่น

      // Dealer ต้องหยุดที่ 17 ไมจั่วเพิ่ม
      Assert.That(game.Dealer.Hand.Cards.Count, Is.EqualTo(2));
      Assert.That(game.Dealer.Hand.GetBestValue(), Is.EqualTo(17));
    }

    [Test]
    public void DealerPlay_ShouldHit_UntilScoreIsAtLeast17()
    {
      var fakeDeck = new FakeDeck(new[]
      {
          new Card { Rank = Rank.Two },   // P1
          new Card { Rank = Rank.Two },   // P1
          new Card { Rank = Rank.Ten },   // Dealer Card 1
          new Card { Rank = Rank.Five },  // Dealer Card 2 (รวม 15)
          new Card { Rank = Rank.Three }, // Dealer Hit 1 (รวม 18 -> หยุด)
          new Card { Rank = Rank.Two }    // ไม่ควรถูกจั่ว
      });

      var game = new BlackjackGame(fakeDeck);
      game.AddPlayer(1);
      game.StartGame();

      game.DealerPlay();

      // Dealer ต้องจั่วเพิ่มอีก 1 ใบแล้วหยุด
      Assert.That(game.Dealer.Hand.Cards.Count, Is.EqualTo(3));
      Assert.That(game.Dealer.Hand.GetBestValue(), Is.EqualTo(18));
    }
  }

  // ==========================================
  // 4. Deck Tests: ทดสอบการสร้างไพ่ 52 ใบ และจั่วจนหมด
  // ==========================================
  [TestFixture]
  public class DeckTests
  {
    [Test]
    public void NewDeck_ShouldHave52Cards()
    {
      var deck = new Deck();
      var cardsDrawn = 0;

      // พยายามจั่วจนกว่าจะหมดกอง
      while (true)
      {
        try
        {
          deck.Draw();
          cardsDrawn++;
        }
        catch (InvalidOperationException)
        {
          break;
        }
      }

      Assert.That(cardsDrawn, Is.EqualTo(52));
    }

    [Test]
    public void DrawFromEmptyDeck_ShouldThrowException()
    {
      var deck = new Deck();

      for (int i = 0; i < 52; i++)
      {
        deck.Draw(); // จั่วทิ้ง 52 ใบ
      }

      // ใบที่ 53 ต้องเกิด Exception
      Assert.Throws<InvalidOperationException>(() => deck.Draw());
    }
  }
}